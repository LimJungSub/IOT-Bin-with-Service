import { useEffect, useMemo, useRef, useState } from "react";
import { trashBins as initialBins, getStatusColor, getStatusText } from "../lib/trashData";
import type { TrashBin } from "../lib/trashData";

import { loadKakaoMaps } from "../lib/kakaoLoader";
import { fetchLatestReading } from "../lib/sensorApi";
import { Navigation, Scale, Droplets, Clock, MapPin } from "lucide-react";

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

// distanceMm: 0~300mm 가정 (가까울수록 더 “가득참”)
function calcFillPercent(distanceMm: number) {
  const max = 300;
  const v = Math.max(0, Math.min(max, distanceMm));
  return Math.round((1 - v / max) * 100);
}

// waterAdc: 0~4095 가정
function calcLiquidPercent(waterAdc: number) {
  const max = 4095;
  const v = Math.max(0, Math.min(max, waterAdc));
  return Math.round((v / max) * 100);
}

export function TrashMap() {
  const [selectedBin, setSelectedBin] = useState<string | null>(null);

  // ✅ 업데이트 가능한 bins state
  const [bins, setBins] = useState<TrashBin[]>(initialBins);

  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});

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

  // ✅ 60주년관 위치 지오코딩해서 Bin-Master 좌표 덮어쓰기
  useEffect(() => {
    if (!kakaoKey) return;

    let canceled = false;

    loadKakaoMaps(kakaoKey).then((kakao) => {
      if (canceled) return;
      if (!kakao.maps?.services?.Geocoder) return;

      const geocoder = new kakao.maps.services.Geocoder();
      const address = "인천 미추홀구 인하로 100 인하대학교 60주년기념관";

      geocoder.addressSearch(address, (result: any[], status: string) => {
        if (canceled) return;
        if (status !== kakao.maps.services.Status.OK || !result?.[0]) return;

        const lng = parseFloat(result[0].x);
        const lat = parseFloat(result[0].y);

        setBins((prev) =>
            prev.map((b) =>
                b.id === "Bin-Master"
                    ? { ...b, location: { ...b.location, lat, lng, address: "인하대학교 60주년기념관" } }
                    : b
            )
        );
      });
    });

    return () => {
      canceled = true;
    };
  }, [kakaoKey]);

  // ✅ 지도 + 마커 렌더 (bins 기준)
  useEffect(() => {
    if (!mapElRef.current) return;
    if (!kakaoKey) {
      console.error("VITE_KAKAO_MAP_KEY가 설정되지 않았습니다.");
      return;
    }

    let canceled = false;

    loadKakaoMaps(kakaoKey).then((kakao) => {
      if (canceled) return;

      // 지도 생성
      const center = new kakao.maps.LatLng(37.4511, 126.6570);
      const map = new kakao.maps.Map(mapElRef.current, { center, level: 7 });
      mapRef.current = map;

      const imageSize = new kakao.maps.Size(36, 48);
      const imageOption = { offset: new kakao.maps.Point(18, 48) };

      const markerImages = {
        critical: new kakao.maps.MarkerImage(pinSvgDataUri(statusColor.critical), imageSize, imageOption),
        warning: new kakao.maps.MarkerImage(pinSvgDataUri(statusColor.warning), imageSize, imageOption),
        normal: new kakao.maps.MarkerImage(pinSvgDataUri(statusColor.normal), imageSize, imageOption),
      } as const;

      const bounds = new kakao.maps.LatLngBounds();

      // ✅ 이전 마커 제거
      Object.values(markersRef.current).forEach((m) => m.setMap(null));
      markersRef.current = {};

      bins.forEach((bin) => {
        const pos = new kakao.maps.LatLng(bin.location.lat, bin.location.lng);
        bounds.extend(pos);

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

      map.setBounds(bounds);
    });

    return () => {
      canceled = true;
      Object.values(markersRef.current).forEach((m) => m.setMap(null));
      markersRef.current = {};
      mapRef.current = null;
    };
  }, [kakaoKey, statusColor, bins]);

  // 선택된 쓰레기통으로 지도 이동(UX)
  useEffect(() => {
    if (!selectedBinData) return;
    const map = mapRef.current;
    const marker = markersRef.current[selectedBinData.id];
    if (!map || !marker) return;

    map.panTo(marker.getPosition());
    marker.setZIndex(999);
  }, [selectedBinData]);

  // ✅ Bin-Master를 클릭했을 때만 실시간 폴링으로 대시보드 갱신
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
                    }
                    : b
            )
        );
      } catch (e) {
        // 잠깐 끊겨도 계속 재시도
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

  return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Display */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="aspect-[16/10] bg-gray-100 relative">
              <div ref={mapElRef} className="absolute inset-0" />

              <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 space-y-2">
                <p className="text-xs text-gray-600">상태별 표시</p>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-600 rounded" /><span className="text-xs text-gray-700">긴급</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-orange-500 rounded" /><span className="text-xs text-gray-700">주의</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-600 rounded" /><span className="text-xs text-gray-700">정상</span></div>
              </div>

              <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2">
                <p className="text-xs text-gray-600">인천광역시</p>
                <p className="text-sm text-gray-900">쓰레기통 {bins.length}개 관리중</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {selectedBinData ? (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-gray-900">{selectedBinData.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{selectedBinData.id}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedBinData.status)}`}>
                {getStatusText(selectedBinData.status)}
              </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">높이 적재율</span>
                      <span className="text-gray-900">{selectedBinData.fillLevel}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                          className={`h-3 rounded-full transition-all ${
                              selectedBinData.status === "critical" ? "bg-red-600" :
                                  selectedBinData.status === "warning" ? "bg-orange-500" :
                                      "bg-green-600"
                          }`}
                          style={{ width: `${selectedBinData.fillLevel}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 border-t">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">무게</span>
                    </div>
                    <span className="text-gray-900">{selectedBinData.weight}kg</span>
                  </div>

                  <div className="py-3 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">액체 감지량</span>
                      </div>
                      <span className="text-gray-900">{selectedBinData.liquidLevel}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="h-2 rounded-full bg-blue-500" style={{ width: `${selectedBinData.liquidLevel}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-3 border-t">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">마지막 수거</span>
                    </div>
                    <span className="text-sm text-gray-900">
                  {selectedBinData.lastCollection.toLocaleDateString("ko-KR")}
                </span>
                  </div>

                  <div className="pt-3 border-t">
                    <div className="flex items-start gap-2">
                      <Navigation className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600 mb-1">주소</p>
                        <p className="text-sm text-gray-900">{selectedBinData.location.address}</p>
                      </div>
                    </div>
                  </div>

                  <button className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors mt-4">
                    수거 완료 처리
                  </button>
                </div>
              </div>
          ) : (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">지도에서 쓰레기통을 선택하세요</p>
                  <p className="text-sm text-gray-400 mt-1">상세 정보를 확인할 수 있습니다</p>
                </div>
              </div>
          )}
        </div>
      </div>
  );
}
