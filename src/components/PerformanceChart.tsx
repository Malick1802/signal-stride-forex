
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const PerformanceChart = () => {
  const [timeframe, setTimeframe] = useState('7d');

  // Mock performance data
  const performanceData = [
    { date: '2024-01-01', value: 10000, profit: 0 },
    { date: '2024-01-02', value: 10250, profit: 250 },
    { date: '2024-01-03', value: 10180, profit: 180 },
    { date: '2024-01-04', value: 10420, profit: 420 },
    { date: '2024-01-05', value: 10380, profit: 380 },
    { date: '2024-01-06', value: 10650, profit: 650 },
    { date: '2024-01-07', value: 10590, profit: 590 }
  ];

  const monthlyData = [
    { month: 'Jan', profit: 1250, loss: -320 },
    { month: 'Feb', profit: 1890, loss: -180 },
    { month: 'Mar', profit: 2100, loss: -250 },
    { month: 'Apr', profit: 1650, loss: -120 },
    { month: 'May', profit: 2350, loss: -290 }
  ];

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-emerald-400 text-2xl font-bold">+15.9%</div>
          <div className="text-gray-400 text-sm">Total Return</div>
          <div className="text-emerald-400 text-xs mt-1">Since inception</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-blue-400 text-2xl font-bold">$16,590</div>
          <div className="text-gray-400 text-sm">Account Value</div>
          <div className="text-blue-400 text-xs mt-1">+5.9% this month</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-purple-400 text-2xl font-bold">1.2</div>
          <div className="text-gray-400 text-sm">Sharpe Ratio</div>
          <div className="text-purple-400 text-xs mt-1">Risk-adjusted</div>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <div className="text-orange-400 text-2xl font-bold">7.8%</div>
          <div className="text-gray-400 text-sm">Max Drawdown</div>
          <div className="text-orange-400 text-xs mt-1">Peak to trough</div>
        </div>
      </div>

      {/* Equity Curve */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Equity Curve</h3>
            <p className="text-gray-400 text-sm">Account value over time</p>
          </div>
          <div className="flex space-x-2">
            {['7d', '30d', '90d', '1y'].map(period => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  timeframe === period
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/10 text-gray-400 hover:text-white'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Performance */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white">Monthly Performance</h3>
          <p className="text-gray-400 text-sm">Profit and loss breakdown by month</p>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="month" 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Bar dataKey="profit" fill="#10B981" />
              <Bar dataKey="loss" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trade Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Trade Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Trades</span>
              <span className="text-white">1,247</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Winning Trades</span>
              <span className="text-emerald-400">1,089 (87.3%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Losing Trades</span>
              <span className="text-red-400">158 (12.7%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Average Win</span>
              <span className="text-emerald-400">+$45.30</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Average Loss</span>
              <span className="text-red-400">-$23.50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Profit Factor</span>
              <span className="text-blue-400">1.93</span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Risk Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Max Consecutive Wins</span>
              <span className="text-emerald-400">23</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Max Consecutive Losses</span>
              <span className="text-red-400">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Average Trade Duration</span>
              <span className="text-white">4h 32m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Best Trade</span>
              <span className="text-emerald-400">+$324.50</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Worst Trade</span>
              <span className="text-red-400">-$87.20</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Recovery Factor</span>
              <span className="text-blue-400">2.04</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;
