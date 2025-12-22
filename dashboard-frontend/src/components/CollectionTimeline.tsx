import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function CollectionTimeline() {
  // Mock data for collection history over the past week
  const data = [
    { date: '12/06', collected: 8, critical: 2 },
    { date: '12/07', collected: 12, critical: 1 },
    { date: '12/08', collected: 10, critical: 3 },
    { date: '12/09', collected: 15, critical: 2 },
    { date: '12/10', collected: 9, critical: 4 },
    { date: '12/11', collected: 11, critical: 3 },
    { date: '12/12', collected: 6, critical: 4 }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-gray-900 mb-4">주간 수거 현황</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
            formatter={(value) => {
              if (value === 'collected') return '수거 완료';
              if (value === 'critical') return '긴급 수거';
              return value;
            }}
          />
          <Line 
            type="monotone" 
            dataKey="collected" 
            stroke="#16a34a" 
            strokeWidth={2}
            dot={{ fill: '#16a34a', r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="critical" 
            stroke="#dc2626" 
            strokeWidth={2}
            dot={{ fill: '#dc2626', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
