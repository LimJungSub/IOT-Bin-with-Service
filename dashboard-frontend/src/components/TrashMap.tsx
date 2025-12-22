import { useEffect, useMemo, useRef, useState } from "react";
import { trashBins as initialBins, getStatusText } from "../lib/trashData";
import type { TrashBin } from "../lib/trashData";

import { loadKakaoMaps } from "../lib/kakaoLoader";
import { fetchLatestReading } from "../lib/sensorApi";
import { Navigation, Scale, Droplets, Clock, MapPin, Route, Truck, AlertTriangle, Trash2, CheckCircle2, X, Satellite } from "lucide-react";

// ----------------------------------------------------------------------
// 1. Helper Functions
// ----------------------------------------------------------------------

function pinSvgDataUri(color: string) {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
    <defs>
      <filter id="s" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.25)"/>
      </filter>
    </defs>
    <g filter="url(#s)">
      <path d="M18 2C11.1 2 5.5 7.6 5.5 14.5C5.5 24.3 18 45.5 18 45.5S30.5 24.3 30.5 14.5C30.5 7.6 24.9 2 18 2Z"
            fill="${color}" stroke="#ffffff" stroke-width="2" />
      <circle cx="18" cy="14.5" r="6" fill="#ffffff" opacity="0.95"/>
    </g>
  </svg>
  `.trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function calcStatusFromReading(r: { needCollection: boolean; waterAdc: number }) {
  if (r.needCollection) return "critical";
  if (r.waterAdc > 500) return "warning";
  return "normal";
}

function calcFillPercent(distanceMm: number) {
  const max = 300;
  const v = Math.max(0, Math.min(max, distanceMm));
  return Math.round((1 - v / max) * 100);
}

function calcLiquidPercent(waterAdc: number) {
  const max = 4095;
  const v = Math.max(0, Math.min(max, waterAdc));
  return Math.round((v / max) * 100);
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function approxDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function buildGreedyRoute(start: TrashBin, targets: TrashBin[]) {
  const remaining = [...targets];
  const route: TrashBin[] = [start];

  let current = start;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i++) {
      const d = approxDistanceMeters(current.location, remaining[i].location);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const [next] = remaining.splice(bestIdx, 1);
    route.push(next);
    current = next;
  }
  return route;
}

// ----------------------------------------------------------------------
// 2. Main Component
// ----------------------------------------------------------------------

export function TrashMap() {
  const [selectedBin, setSelectedBin] = useState<string | null>(null);
  const [bins, setBins] = useState<TrashBin[]>(initialBins);

  // Bin-Master GPS 상태(하드웨어가 lat/lng를 보내는 동안만 ON으로 간주)
  const [binMasterGps, setBinMasterGps] = useState<{ on: boolean; lastAt: Date | null }>({
    on: false,
    lastAt: null,
  });

  // 수거 경로 상태
  const [collectionActive, setCollectionActive] = useState(false);
  const [collectedIds, setCollectedIds] = useState<string[]>([]);
  const [routeStartId, setRouteStartId] = useState<string>("Bin-Master");

  const collectedSet = useMemo(() => new Set(collectedIds), [collectedIds]);

  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [kakaoMapLoaded, setKakaoMapLoaded] = useState(false);
  const markersRef = useRef<Record<string, any>>({});
  const routeLineRef = useRef<any>(null);

  const selectedBinData = selectedBin ? bins.find((bin) => bin.id === selectedBin) : null;
  const kakaoKey = import.meta.env.VITE_KAKAO_MAP_KEY;

  const statusColor = useMemo(
      () => ({
        critical: "#dc2626",
        warning: "#f97316",
        normal: "#16a34a",
      }),
      []
  );

  // 1. 초기 60주년관 위치 설정 - 부정확한 위치로 인해 아래로 대체
  // useEffect(() => {
  //   if (!kakaoKey) return;
  //   let canceled = false;
  //
  //   loadKakaoMaps(kakaoKey).then((kakao) => {
  //     if (canceled) return;
  //     if (!kakao.maps?.services?.Geocoder) return;
  //
  //     const geocoder = new kakao.maps.services.Geocoder();
  //     const address = "인천 미추홀구 인하로 100 인하대학교 60주년기념관";
  //
  //     geocoder.addressSearch(address, (result: any[], status: string) => {
  //       if (canceled) return;
  //       if (status !== kakao.maps.services.Status.OK || !result?.[0]) return;
  //
  //       const lng = parseFloat(result[0].x);
  //       const lat = parseFloat(result[0].y);
  //
  //       setBins((prev) =>
  //           prev.map((b) =>
  //               b.id === "Bin-Master"
  //                   ? { ...b, location: { ...b.location, lat, lng, address: "인하대학교 60주년기념관" } }
  //                   : b
  //           )
  //       );
  //     });
  //   });
  //   return () => { canceled = true; };
  // }, [kakaoKey]);

  // 1. 초기 60주년관 위치 설정 (직접 입력 방식)
  useEffect(() => {
    const FIXED_LAT = 37.450902; // 위도
    const FIXED_LNG = 126.654207; // 경도

    setBins((prev) =>
        prev.map((b) =>
            b.id === "Bin-Master"
                ? {
                  ...b,
                  location: {
                    ...b.location,
                    lat: FIXED_LAT,
                    lng: FIXED_LNG,
                    address: "인하대학교 60주년기념관"
                  }
                }
                : b
        )
    );
  }, []); // 의존성 배열을 비워 처음에 한 번만 실행되게 함

  // 2. 수거 대상 필터링
  const collectionTargets = useMemo(() => {
    return bins.filter((b) =>
        b.id !== "Bin-Master" &&
        (b.status === "critical" || b.status === "warning") &&
        !collectedSet.has(b.id)
    );
  }, [bins, collectedSet]);

  // 3. 경로 계산
  const routeBins = useMemo(() => {
    if (!collectionActive) return [] as TrashBin[];
    const start = bins.find((b) => b.id === routeStartId) ?? bins.find((b) => b.id === "Bin-Master");
    if (!start) return [] as TrashBin[];

    if (collectionTargets.length === 0) return [start];
    return buildGreedyRoute(start, collectionTargets);
  }, [bins, collectionActive, collectionTargets, routeStartId]);

  const routeIds = useMemo(() => routeBins.map((b) => b.id), [routeBins]);

  // --- Handlers ---
  const startCollection = () => {
    setCollectionActive(true);
    setCollectedIds([]);
    setRouteStartId("Bin-Master");
    setSelectedBin("Bin-Master");
  };

  const stopCollection = () => {
    setCollectionActive(false);
    setCollectedIds([]);
    setRouteStartId("Bin-Master");
  };

  const markCollected = (binId: string) => {
    if (!binId || binId === "Bin-Master") return;

    setBins((prev) =>
        prev.map((b) =>
            b.id === binId
                ? {
                  ...b,
                  fillLevel: 0,
                  weight: 0,
                  liquidLevel: 0,
                  status: "normal",
                  lastCollection: new Date(),
                }
                : b,
        ),
    );
    setCollectedIds((prev) => (prev.includes(binId) ? prev : [...prev, binId]));
    setRouteStartId(binId);
  };

  // 4-1. 지도 초기화
  useEffect(() => {
    if (!mapElRef.current) return;
    if (!kakaoKey) {
      console.error("VITE_KAKAO_MAP_KEY가 설정되지 않았습니다.");
      return;
    }
    if (mapRef.current) return;

    loadKakaoMaps(kakaoKey).then((kakao) => {
      const center = new kakao.maps.LatLng(37.4511, 126.6570);
      const map = new kakao.maps.Map(mapElRef.current, { center, level: 7 });
      mapRef.current = map;
      setKakaoMapLoaded(true);
    });
  }, [kakaoKey]);

  // 4-2. 마커 및 경로 업데이트
  useEffect(() => {
    if (!kakaoMapLoaded || !mapRef.current) return;

    const kakao = (window as any).kakao;
    if (!kakao) return;

    const map = mapRef.current;
    const imageSize = new kakao.maps.Size(36, 48);
    const imageOption = { offset: new kakao.maps.Point(18, 48) };

    const markerImages = {
      critical: new kakao.maps.MarkerImage(pinSvgDataUri(statusColor.critical), imageSize, imageOption),
      warning: new kakao.maps.MarkerImage(pinSvgDataUri(statusColor.warning), imageSize, imageOption),
      normal: new kakao.maps.MarkerImage(pinSvgDataUri(statusColor.normal), imageSize, imageOption),
    } as const;

    Object.values(markersRef.current).forEach((m: any) => m.setMap(null));
    markersRef.current = {};
    if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
      routeLineRef.current = null;
    }

    bins.forEach((bin) => {
      const pos = new kakao.maps.LatLng(bin.location.lat, bin.location.lng);
      const marker = new kakao.maps.Marker({
        position: pos,
        clickable: true,
        image: markerImages[bin.status],
      });

      marker.setMap(map);

      kakao.maps.event.addListener(marker, "click", () => {
        setSelectedBin(bin.id);
      });

      markersRef.current[bin.id] = marker;
    });

    if (collectionActive && routeBins.length >= 2) {
      const path = routeBins.map((b) => new kakao.maps.LatLng(b.location.lat, b.location.lng));
      routeLineRef.current = new kakao.maps.Polyline({
        path,
        strokeWeight: 5,
        strokeColor: "#2563eb",
        strokeOpacity: 0.85,
        strokeStyle: "solid",
      });
      routeLineRef.current.setMap(map);
    }

  }, [kakaoMapLoaded, bins, collectionActive, routeBins, statusColor]);

  useEffect(() => {
    if (!selectedBinData) return;
    const map = mapRef.current;
    if (!map) return;

    const marker = markersRef.current[selectedBinData.id];
    if (!marker) return;

    map.panTo(marker.getPosition());
    marker.setZIndex(999);
  }, [selectedBinData]);

  useEffect(() => {
    if (!collectionActive) return;
    const nextId = routeIds[1];
    if (!nextId) return;

    if (!selectedBin || selectedBin === routeStartId || collectedSet.has(selectedBin)) {
      setSelectedBin(nextId);
    }
  }, [collectionActive, routeIds, selectedBin, routeStartId, collectedSet]);

  useEffect(() => {
    if (selectedBin !== "Bin-Master") return;

    let alive = true;
    let timer: number | null = null;

    const tick = async () => {
      try {
        const latest = await fetchLatestReading("Bin-Master");
        if (!alive || !latest) return;

        const fill = calcFillPercent(latest.distanceMm);
        const liquid = calcLiquidPercent(latest.waterAdc);
        const weightKg = Math.round((latest.weightG / 1000) * 1000) / 1000;
        const status = calcStatusFromReading({ needCollection: latest.needCollection, waterAdc: latest.waterAdc });

        const hasGps =
            typeof latest.lat === "number" &&
            typeof latest.lng === "number" &&
            Number.isFinite(latest.lat) &&
            Number.isFinite(latest.lng);

        // GPS ON/OFF 상태 업데이트
        setBinMasterGps((prev) => ({
          on: hasGps,
          lastAt: hasGps ? new Date(latest.createdAt) : prev.lastAt,
        }));

        setBins((prev) =>
            prev.map((b) =>
                b.id === "Bin-Master"
                    ? {
                      ...b,
                      fillLevel: fill,
                      liquidLevel: liquid,
                      weight: weightKg,
                      status,
                      lastCollection: new Date(latest.createdAt),
                      ...(hasGps
                          ? { location: { ...b.location, lat: latest.lat as number, lng: latest.lng as number } }
                          : {}),
                    }
                    : b
            )
        );
      } catch (e) {
        console.warn("Bin-Master latest fetch 실패:", e);
      }
    };

    tick();
    timer = window.setInterval(tick, 2000);

    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
    };
  }, [selectedBin]);

  // [Helper] 그래프 색상 (강제 적용)
  const getBarColor = (status: string) => {
    if (status === 'critical') return '#ef4444';
    if (status === 'warning') return '#f97316';
    return '#22c55e';
  };

  // [Helper] 뱃지 스타일 (강제 적용)
  const getBadgeStyle = (status: string) => {
    const baseStyle = {
      borderWidth: '1px',
      borderStyle: 'solid'
    };
    if (status === 'critical') {
      return { ...baseStyle, color: '#dc2626', borderColor: '#dc2626', backgroundColor: '#fef2f2' };
    } else if (status === 'warning') {
      return { ...baseStyle, color: '#ea580c', borderColor: '#ea580c', backgroundColor: '#fff7ed' };
    } else {
      return { ...baseStyle, color: '#16a34a', borderColor: '#16a34a', backgroundColor: '#f0fdf4' };
    }
  };

  return (
      <div className="space-y-6">

        {/* ===================================================================================== */}
        {/* [Header] */}
        {/* ===================================================================================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white px-10 py-6 rounded-xl shadow-sm border border-gray-200">

          {/* ✅ [수정] style={{ paddingLeft: '50px' }}로 왼쪽 여백 강제 적용 */}
          <div style={{ paddingLeft: '50px' }}>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-7 h-7 text-blue-600" />
              IoT 스마트 쓰레기통 관제 시스템
            </h1>
            <p className="text-sm text-gray-500 mt-1 pl-9">Wifi-Connected Master Bin Location : 인하대학교 60주년 기념관</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-500 mb-0.5">현재 수거 대상 (주의+긴급)</p>
              <p className="text-xl font-black text-red-600 leading-none">{collectionTargets.length} 개소</p>
            </div>

            {/* ✅ [수정] 버튼 영역: 크기(260x52), 직각(0px) 고정, 색상 강제 */}
            {!collectionActive ? (
                // 1. 수거 경로 추천 버튼
                <button
                    onClick={startCollection}
                    disabled={collectionTargets.length === 0}
                    style={{
                      width: '260px',
                      height: '52px',
                      backgroundColor: collectionTargets.length > 0 ? '#2563eb' : '#f3f4f6', // Blue or Gray
                      color: collectionTargets.length > 0 ? '#ffffff' : '#9ca3af',           // White or Gray
                      cursor: collectionTargets.length > 0 ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      borderRadius: '0px', // 라운딩 없음 (직각)
                      fontWeight: 'bold',
                      fontSize: '16px',
                      border: 'none',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                >
                  <Route className="w-5 h-5" />
                  수거 경로 추천
                </button>
            ) : (
                // 2. 안내 중 & 종료 컨트롤
                <div
                    style={{
                      width: '260px',
                      height: '52px',
                      display: 'flex',
                      borderRadius: '0px', // 라운딩 없음 (직각)
                      overflow: 'hidden',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #d1d5db',
                      backgroundColor: '#ffffff'
                    }}
                >

                  {/* 왼쪽: 안내 중 (60%) - 색상 강제 */}
                  <div style={{
                    flex: '6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: '#ecfdf5', // 연한 초록색
                    borderRight: '1px solid #d1d5db'
                  }}>
                     <span className="relative flex h-3 w-3">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#4ade80' }}></span>
                       <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: '#16a34a' }}></span>
                     </span>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#15803d' }}>
                       안내 중
                     </span>
                  </div>

                  {/* 오른쪽: 종료 (40%) - 색상 강제 */}
                  <button
                      onClick={stopCollection}
                      style={{
                        flex: '4',
                        height: '100%',
                        border: 'none',
                        backgroundColor: '#f3f4f6', // 회색
                        color: '#4b5563',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fee2e2'; // 연한 빨강
                        e.currentTarget.style.color = '#dc2626';           // 진한 빨강
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6'; // 원래 회색
                        e.currentTarget.style.color = '#4b5563';
                      }}
                  >
                    <X className="w-4 h-4" />
                    종료
                  </button>
                </div>
            )}
          </div>
        </div>


        {/* ===================================================================================== */}
        {/* 메인 콘텐츠 */}
        {/* ===================================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

          {/* 좌측: 지도 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="relative w-full" style={{ height: '700px' }}>
                <div ref={mapElRef} className="absolute inset-0 w-full h-full" />

                {/* 범례 */}
                <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur rounded-lg shadow-md p-4 space-y-2 border border-gray-200">
                  <p className="text-xs text-gray-600 font-bold mb-1">상태 범례</p>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-600 rounded-full shadow-sm" /><span className="text-xs text-gray-700 font-medium">긴급 (즉시 수거)</span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 bg-orange-500 rounded-full shadow-sm" /><span className="text-xs text-gray-700 font-medium">주의 (수거 대상)</span></div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-600 rounded-full shadow-sm" /><span className="text-xs text-gray-700 font-medium">정상</span></div>
                </div>

                {/* 정보 */}
                <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur rounded-lg shadow-md px-4 py-2 border border-gray-200">
                  <p className="text-xs text-gray-600">인천광역시</p>
                  <p className="text-sm text-gray-900 font-medium">총 {bins.length}개 쓰레기통 모니터링</p>
                </div>
              </div>
            </div>
          </div>


          {/* 우측: 상세 정보 패널 */}
          <div className="h-full">
            {selectedBinData ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col" style={{ minHeight: '700px' }}>

                  {/* Header: 이름 및 상태 */}
                  <div className="flex items-start justify-between mb-10 pb-6 border-b border-gray-100 shrink-0">
                    <div>
                      {/* ✅ [수정 완료] 글자 크기와 굵기 대폭 확대 */}
                      <h3 className="text-gray-900 font-black text-3xl tracking-tight leading-tight">{selectedBinData.name}</h3>
                      <p className="text-sm text-gray-400 mt-1 font-mono">{selectedBinData.id}</p>
                    </div>

                    {/* 상태 뱃지 (스타일 강제) */}
                    <span
                        className="px-3 py-1.5 rounded-full text-xs font-bold"
                        style={getBadgeStyle(selectedBinData.status)}
                    >
                        {getStatusText(selectedBinData.status)}
                      </span>
                  </div>

                  {/* Body: 상세 정보 */}
                  <div className="flex-1 overflow-y-auto pr-2">
                    &nbsp;
                    {/* 1. 적재율 섹션 */}
                    <div className="mb-12">
                      <div className="flex items-center gap-2 mb-3">
                        <Trash2 className="w-5 h-5 text-gray-500" />
                        <span className="text-base font-bold text-gray-700">쓰레기 적재율</span>
                      </div>

                      <div className="flex items-end justify-between mb-2 px-1">
                            <span className="text-4xl font-black text-gray-900 tracking-tight">
                                {selectedBinData.fillLevel}<span className="text-xl text-gray-400 font-bold ml-1">%</span>
                            </span>
                        <span className={`text-sm font-bold ${selectedBinData.status === 'critical' ? 'text-red-500' : 'text-gray-400'}`}>
                                {selectedBinData.status === 'critical' ? '가득 참!' : '여유 있음'}
                            </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${selectedBinData.fillLevel}%`,
                              backgroundColor: getBarColor(selectedBinData.status)
                            }}
                        />
                      </div>

                      <div className="flex justify-between mt-1 px-1">
                        <span className="text-[10px] font-medium text-gray-400">0%</span>
                        <span className="text-[10px] font-medium text-gray-400">100%</span>
                      </div>

                      {selectedBinData.status === "critical" && (
                          <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-center justify-center gap-2 border border-red-100 animate-pulse">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-bold text-red-600">즉시 수거가 필요합니다</span>
                          </div>
                      )}
                    </div>
                    &nbsp;
                    {/* 2. 센서 데이터 그리드 */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center hover:border-blue-300 transition-colors shadow-sm">
                        <Scale className="w-6 h-6 text-gray-400 mb-2" />
                        <span className="text-xs text-gray-500 font-bold mb-1">무게</span>
                        <p className="text-xl font-black text-gray-900">{selectedBinData.weight}<span className="text-sm font-medium text-gray-400 ml-1">kg</span></p>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center hover:border-blue-300 transition-colors shadow-sm">
                        <Droplets className="w-6 h-6 text-gray-400 mb-2" />
                        <span className="text-xs text-gray-500 font-bold mb-1">액체 오염</span>
                        <p className="text-xl font-black text-gray-900">{selectedBinData.liquidLevel}<span className="text-sm font-medium text-gray-400 ml-1">%</span></p>
                      </div>
                    </div>
                    &nbsp;
                    {/* 3. 부가 정보 */}
                    <div className="pt-4 border-t border-gray-100 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">마지막 수거</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                                {selectedBinData.lastCollection.toLocaleDateString("ko-KR")}
                            </span>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 text-gray-500 shrink-0">
                          <Navigation className="w-4 h-4 mt-0.5" />
                          <span className="text-sm font-medium">설치 위치</span>
                        </div>

                        {(() => {
                          // 모든 쓰레기통에 GPS 버튼 노출: 기본 OFF
                          // 실시간 GPS는 Bin-Master만 polling으로 갱신됨
                          const gps = selectedBinData.id === "Bin-Master"
                            ? binMasterGps
                            : { on: false, lastAt: null as Date | null };

                          const pillBaseStyle = {
                            width: "fit-content",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            padding: "4px 10px",
                            height: "26px",
                            borderRadius: "9999px",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            fontSize: "11px",
                            fontWeight: 800,
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                            cursor: "pointer",
                          };

                          const pillStateStyle = gps.on
                            ? { borderColor: "#16a34a", color: "#16a34a", backgroundColor: "#f0fdf4" }
                            : { borderColor: "#9ca3af", color: "#6b7280", backgroundColor: "#f9fafb" };

                          return (
                            <div
                              className="flex flex-1 min-w-0"
                              style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}
                            >
                              <span className="text-sm font-bold text-gray-900 text-right break-words min-w-0">
                                {selectedBinData.location.address}
                              </span>

                              <button
                                type="button"
                                onClick={() => {
                                  const msg = gps.on
                                    ? `GPS: ON\n(최근 GPS 갱신: ${gps.lastAt ? gps.lastAt.toLocaleString("ko-KR") : "-"})`
                                    : `GPS: OFF\n(최근 GPS 갱신: ${gps.lastAt ? gps.lastAt.toLocaleString("ko-KR") : "-"})`;
                                  window.alert(msg);
                                }}
                                style={{ ...pillBaseStyle, ...pillStateStyle }}
                                title={gps.on ? "GPS ON" : "GPS OFF"}
                              >
                                <Satellite className="w-3.5 h-3.5" />
                                <span>{gps.on ? "GPS ON" : "GPS OFF"}</span>
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                  </div>

                  {/* Footer: 수거 완료 버튼 */}
                  {selectedBinData.id !== "Bin-Master" && (selectedBinData.status === "critical" || selectedBinData.status === "warning") && (
                      <div className="mt-auto pt-4">
                        <button
                            className="w-full py-4 rounded-xl transition-all bg-green-600 text-white font-bold text-lg hover:bg-green-700 hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                            onClick={() => markCollected(selectedBinData.id)}
                        >
                          <CheckCircle2 className="w-6 h-6" />
                          <span>수거 완료 처리</span>
                        </button>
                      </div>
                  )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center text-center text-gray-500 h-[500px] lg:h-[700px]">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100 shadow-inner">
                    <MapPin className="w-10 h-10 text-gray-300" />
                  </div>
                  <h3 className="text-gray-900 font-bold text-xl mb-2">선택된 쓰레기통 없음</h3>
                  <p className="text-sm leading-relaxed text-gray-400">지도에서 마커를 클릭하여<br/>실시간 상태 정보를 확인하세요.</p>
                </div>
            )}
          </div>
        </div>
      </div>
  );
}