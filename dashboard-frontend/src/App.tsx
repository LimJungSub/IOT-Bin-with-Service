import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { TrashMap } from './components/TrashMap';
import { TrashList } from './components/TrashList';
import { Trash2, BarChart3, Map, List } from 'lucide-react';

export default function App() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'map' | 'list'>('dashboard');

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">

            {/* Header */}
            <header className="bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b">

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-600 p-2 rounded-lg">
                                <Trash2 className="w-6 h-6 text-white"/>
                            </div>
                            <div>
                                <h1 className="text-gray-900">스마트 쓰레기 수거 시스템</h1>
                                <p className="text-sm text-gray-500">실시간 센서 모니터링</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">마지막 업데이트</p>
                            <p className="text-gray-900">{new Date().toLocaleString('ko-KR')}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                                activeTab === 'dashboard'
                                    ? 'border-green-600 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <BarChart3 className="w-5 h-5"/>
                            <span>대시보드</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('map')}
                            className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                                activeTab === 'map'
                                    ? 'border-green-600 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Map className="w-5 h-5"/>
                            <span>지도</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                                activeTab === 'list'
                                    ? 'border-green-600 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <List className="w-5 h-5"/>
                            <span>수거 목록</span>
                        </button>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'dashboard' && <Dashboard/>}
                {activeTab === 'map' && <TrashMap/>}
                {activeTab === 'list' && <TrashList/>}
            </main>
        </div>
    );
}
