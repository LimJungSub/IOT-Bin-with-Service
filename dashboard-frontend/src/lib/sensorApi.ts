// src/lib/sensorApi.ts
export type SensorReading = {
    id: number;
    binId: string;
    distanceMm: number;
    weightG: number;
    waterAdc: number;
    needCollection: boolean;
    createdAt: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

// ✅ 백엔드가 /api/readings/latest 를 제공한다고 가정
export async function fetchLatestReading(binId: string): Promise<SensorReading | null> {
    const res = await fetch(`${API_BASE}/api/readings/latest?binId=${encodeURIComponent(binId)}`);
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`latest fetch failed: ${res.status}`);
    return res.json();
}