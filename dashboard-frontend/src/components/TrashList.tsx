import { useState } from 'react';
import { trashBins, getStatusColor, getStatusText, type TrashBin } from '../lib/trashData';
import { Search, ArrowUpDown, Scale, Droplets, MapPin, Clock } from 'lucide-react';

type SortField = 'fillLevel' | 'name' | 'lastCollection' | 'weight';

export function TrashList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | TrashBin['status']>('all');
  const [sortField, setSortField] = useState<SortField>('fillLevel');

  const filteredAndSortedBins = trashBins
    .filter(bin => {
      const matchesSearch = 
        bin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bin.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bin.location.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterStatus === 'all' || bin.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'fillLevel':
          comparison = a.fillLevel - b.fillLevel;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ko-KR');
          break;
        case 'lastCollection':
          comparison = a.lastCollection.getTime() - b.lastCollection.getTime();
          break;
        case 'weight':
          comparison = a.weight - b.weight;
          break;
      }
      
      return -comparison;
    });

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="쓰레기통 이름, ID, 주소 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilterStatus('critical')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'critical'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
            >
              긴급
            </button>
            <button
              onClick={() => setFilterStatus('warning')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'warning'
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
              }`}
            >
              주의
            </button>
            <button
              onClick={() => setFilterStatus('normal')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filterStatus === 'normal'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
            >
              정상
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          총 <span className="text-gray-900">{filteredAndSortedBins.length}</span>개의 쓰레기통
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <ArrowUpDown className="w-4 h-4" />
          <span>정렬:</span>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="fillLevel">높이 적재율</option>
            <option value="name">이름</option>
            <option value="lastCollection">수거 시간</option>
            <option value="weight">무게</option>
          </select>
        </div>
      </div>

      {/* Bins List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredAndSortedBins.map(bin => (
          <div
            key={bin.id}
            className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-gray-900">{bin.name}</h3>
                  <span className="text-sm text-gray-500">{bin.id}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(bin.status)}`}>
                    {getStatusText(bin.status)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{bin.location.address}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Fill Level */}
              <div>
                <p className="text-xs text-gray-500 mb-2">높이 적재율</p>
                <div className="space-y-1">
                  <p className={`${
                    bin.status === 'critical' ? 'text-red-600' :
                    bin.status === 'warning' ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {bin.fillLevel}%
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        bin.status === 'critical' ? 'bg-red-600' :
                        bin.status === 'warning' ? 'bg-orange-500' :
                        'bg-green-600'
                      }`}
                      style={{ width: `${bin.fillLevel}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Weight */}
              <div>
                <p className="text-xs text-gray-500 mb-2">무게</p>
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{bin.weight}kg</span>
                </div>
              </div>

              {/* Liquid Level */}
              <div>
                <p className="text-xs text-gray-500 mb-2">액체 감지량</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-900">{bin.liquidLevel}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${bin.liquidLevel}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Last Collection */}
              <div>
                <p className="text-xs text-gray-500 mb-2">마지막 수거</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">
                    {bin.lastCollection.toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            {bin.status === 'critical' && (
              <div className="mt-4 pt-4 border-t">
                <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors">
                  긴급 수거 처리
                </button>
              </div>
            )}
            {bin.status === 'warning' && (
              <div className="mt-4 pt-4 border-t">
                <button className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition-colors">
                  수거 예약
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredAndSortedBins.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <p className="text-gray-500">검색 결과가 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">다른 검색어를 입력하거나 필터를 변경해보세요</p>
          </div>
        )}
      </div>
    </div>
  );
}