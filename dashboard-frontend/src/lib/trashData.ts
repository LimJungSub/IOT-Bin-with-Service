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
    name: '인하대학교 60주년관 (실시간)',
    location: {
      lat: 37.4511,   // 임시 (지오코딩으로 덮어쓰기)
      lng: 126.6570,  // 임시
      address: '인하대학교 60주년기념관'
    },
    fillLevel: 0,
    weight: 0,
    liquidLevel: 0,
    lastCollection: new Date(),
    status: 'normal'
  },

  // 기존 10개 그대로...
  {
    id: 'TB-001',
    name: '인하대학교 정문',
    location: { lat: 37.4511, lng: 126.6570, address: '인천광역시 미추홀구 인하로 100' },
    fillLevel: 92, weight: 45.3, liquidLevel: 15,
    lastCollection: new Date('2025-12-11T14:30:00'),
    status: 'critical'
  },
  // ...
];
