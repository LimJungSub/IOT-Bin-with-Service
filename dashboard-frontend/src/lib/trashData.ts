export interface TrashBin {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  fillLevel: number;
  weight: number;
  liquidLevel: number;
  lastCollection: Date;
  status: 'normal' | 'warning' | 'critical';
}

export function getStatusColor(status: TrashBin["status"]) {
  switch (status) {
    case "critical": return "text-red-600 bg-red-50";
    case "warning":  return "text-orange-600 bg-orange-50";
    case "normal":   return "text-green-600 bg-green-50";
  }
}

export function getStatusText(status: TrashBin["status"]) {
  switch (status) {
    case "critical": return "긴급";
    case "warning":  return "주의";
    case "normal":   return "정상";
  }
}


export const trashBins: TrashBin[] = [
  // ✅ 추가: 실시간 쓰레기통 (MQTT bin_id = Bin-Master)
  {
    id: 'Bin-Master',
    name: '인하대학교 60주년관',
    location: {
      lat: 37.450902,   // 임시 (지오코딩으로 덮어쓰기)
      lng: 126.654207,  // 임시
      address: '인하대학교 60주년기념관'
    },
    fillLevel: 0,
    weight: 0,
    liquidLevel: 0,
    lastCollection: new Date(),
    status: 'normal'
  },

  // ✅ 데모용: Bin-Master(기준 좌표) 근처 랜덤 4개 지점
  // (lat/lng는 Bin-Master 임시 좌표(37.4511, 126.6570) 주변으로 약간씩 오프셋)
  {
    id: 'TB-RND-01',
    name: '인하대 인근 A (데모용)',
    location: { lat: 37.4524, lng: 126.6578, address: '인하대학교 60주년기념관 인근 A' },
    fillLevel: 37,
    weight: 12.4,
    liquidLevel: 5,
    lastCollection: new Date('2025-12-12T10:15:00'),
    status: 'normal'
  },
  {
    id: 'TB-RND-02',
    name: '인하대 인근 B (데모용)',
    location: { lat: 37.4502, lng: 126.6559, address: '인하대학교 60주년기념관 인근 B' },
    fillLevel: 68,
    weight: 28.1,
    liquidLevel: 22,
    lastCollection: new Date('2025-12-10T16:40:00'),
    status: 'warning'
  },
  {
    id: 'TB-RND-03',
    name: '인하대 인근 C (데모용)',
    location: { lat: 37.4498, lng: 126.6586, address: '인하대학교 60주년기념관 인근 C' },
    fillLevel: 88,
    weight: 41.7,
    liquidLevel: 12,
    lastCollection: new Date('2025-12-11T09:05:00'),
    status: 'critical'
  },
  {
    id: 'TB-RND-04',
    name: '인하대 인근 D (데모용)',
    location: { lat: 37.4520, lng: 126.6554, address: '인하대학교 60주년기념관 인근 D' },
    fillLevel: 54,
    weight: 19.6,
    liquidLevel: 60,
    lastCollection: new Date('2025-12-09T13:25:00'),
    status: 'warning'
  },

  // 기존 샘플 1개
  {
    id: 'TB-001',
    name: '인하대학교 정문',
    location: { lat: 37.4511, lng: 126.6570, address: '인천광역시 미추홀구 인하로 100' },
    fillLevel: 92, weight: 45.3, liquidLevel: 15,
    lastCollection: new Date('2025-12-11T14:30:00'),
    status: 'critical'
  },
];
