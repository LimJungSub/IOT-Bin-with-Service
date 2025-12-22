import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";
import { trashBins } from "../lib/trashData";

// 차트 데이터 타입 정의
type BinStatus = "critical" | "warning" | "normal";

interface ChartDataPoint {
    name: string;      // id
    fullName: string;  // 실제 이름
    fillLevel: number; // 적재율
    status: BinStatus;
}

export function FillLevelChart() {
    const data: ChartDataPoint[] = trashBins
        .map<ChartDataPoint>((bin) => ({
            name: bin.id,
            fullName: bin.name,
            fillLevel: bin.fillLevel,
            status: bin.status as BinStatus,
        }))
        .sort((a, b) => b.fillLevel - a.fillLevel);

    const getBarColor = (status: BinStatus) => {
        switch (status) {
            case "critical":
                return "#dc2626";
            case "warning":
                return "#ea580c";
            default:
                return "#16a34a";
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-gray-900 mb-4">쓰레기통 적재율</h2>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                    />
                    <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                        domain={[0, 100]}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                        }}
                        formatter={(
                            value: number,
                            _name: string,
                            item: Payload<number, string>
                        ) => {
                            const p = item?.payload as ChartDataPoint | undefined;
                            return [
                                `${value}%`,
                                p?.fullName ?? _name,
                            ];
                        }}
                    />
                    <Bar dataKey="fillLevel" radius={[4, 4, 0, 0]}>
                        {data.map((entry) => (
                            <Cell
                                key={entry.name}
                                fill={getBarColor(entry.status)}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-600 rounded" />
                    <span className="text-sm text-gray-600">긴급 (85%+)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-600 rounded" />
                    <span className="text-sm text-gray-600">주의 (70-84%)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-600 rounded" />
                    <span className="text-sm text-gray-600">정상 (&lt;70%)</span>
                </div>
            </div>
        </div>
    );
}
