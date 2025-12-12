import { trashBins } from '../lib/trashData';
import { AlertTriangle, Trash2, CheckCircle, TrendingUp } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { FillLevelChart } from './FillLevelChart';
import { CollectionTimeline } from './CollectionTimeline';

export function Dashboard() {
  const criticalBins = trashBins.filter(bin => bin.status === 'critical').length;
  const warningBins = trashBins.filter(bin => bin.status === 'warning').length;
  const normalBins = trashBins.filter(bin => bin.status === 'normal').length;
  const avgFillLevel = Math.round(
    trashBins.reduce((sum, bin) => sum + bin.fillLevel, 0) / trashBins.length
  );

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {criticalBins > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-red-900">
                <span>{criticalBins}개</span>의 쓰레기통이 긴급 수거가 필요합니다.
              </p>
              <p className="text-sm text-red-700 mt-1">
                높이 적재율, 무게, 액체량을 고려하여 우선적으로 수거해주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="긴급 수거 필요"
          value={criticalBins}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="red"
          description="적재율 85% 이상"
        />
        <StatsCard
          title="주의 필요"
          value={warningBins}
          icon={<TrendingUp className="w-6 h-6" />}
          color="orange"
          description="적재율 70-84%"
        />
        <StatsCard
          title="정상"
          value={normalBins}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
          description="적재율 70% 미만"
        />
        <StatsCard
          title="평균 적재율"
          value={`${avgFillLevel}%`}
          icon={<Trash2 className="w-6 h-6" />}
          color="blue"
          description="전체 쓰레기통"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FillLevelChart />
        <CollectionTimeline />
      </div>

      {/* Critical Bins List */}
      {criticalBins > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-gray-900 mb-4">긴급 수거 목록</h2>
          <div className="space-y-3">
            {trashBins
              .filter(bin => bin.status === 'critical')
              .sort((a, b) => b.fillLevel - a.fillLevel)
              .map(bin => (
                <div
                  key={bin.id}
                  className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">{bin.name}</span>
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                        {bin.id}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{bin.location.address}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">높이</p>
                      <p className="text-red-600">{bin.fillLevel}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">무게</p>
                      <p className="text-gray-900">{bin.weight}kg</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">액체</p>
                      <p className="text-gray-900">{bin.liquidLevel}%</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}