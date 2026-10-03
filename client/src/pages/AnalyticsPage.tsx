import { useEffect, useState } from 'react';
import {
  BarChart2, TrendingUp, Target, BookOpen, Brain, Flame,
  Trophy, MessageSquare, CheckCircle2
} from 'lucide-react';
import { analyticsAPI } from '../api/client';
import { AnalyticsData } from '../types';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  mastered: '#10b981', strong: '#06b6d4', developing: '#6366f1',
  learning: '#f59e0b', weak: '#ef4444', new: '#475569',
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsAPI.get().then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>;
  if (!data) return <div style={{ color: 'var(--color-text-muted)' }}>Failed to load analytics.</div>;

  const { overview, statusDistribution, categoryPerformance, dailyProgress } = data;

  const pieData = statusDistribution.map((s) => ({
    name: s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] || '#475569',
  }));

  const chartData = dailyProgress.slice(-14).map((d) => ({
    day: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    words: d.wordsLearned,
    revision: d.revisionScore,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>📊 Analytics</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Track your vocabulary learning progress
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Words Learned', value: overview.totalLearned, icon: BookOpen, color: '#6366f1' },
          { label: 'Words Mastered', value: overview.totalMastered, icon: Brain, color: '#10b981' },
          { label: 'Accuracy', value: `${overview.accuracy}%`, icon: Target, color: '#f59e0b' },
          { label: 'Current Streak', value: `${overview.currentStreak}d`, icon: Flame, color: '#ef4444' },
          { label: 'Longest Streak', value: `${overview.longestStreak}d`, icon: Trophy, color: '#8b5cf6' },
          { label: 'Total Sessions', value: overview.totalSessions, icon: CheckCircle2, color: '#06b6d4' },
          { label: 'Sentences', value: overview.sentencesCreated, icon: MessageSquare, color: '#f59e0b' },
          { label: 'Avg Sentence Score', value: `${overview.avgSentenceScore}%`, icon: TrendingUp, color: '#10b981' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '20px' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-faint)' }}>{label.toUpperCase()}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily progress */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} style={{ color: 'var(--color-primary-light)' }} />
            <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>14-Day Progress</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="aWords" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }} />
              <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', color: 'var(--color-text)' }} />
              <Area type="monotone" dataKey="words" stroke="#6366f1" strokeWidth={2} fill="url(#aWords)" name="Words Learned" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution pie */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={18} style={{ color: '#10b981' }} />
            <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>Mastery Distribution</h2>
          </div>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48" style={{ color: 'var(--color-text-faint)' }}>
              Start learning to see your distribution
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px' }} />
                <Legend formatter={(value) => <span style={{ color: 'var(--color-text)', fontSize: '12px' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category performance */}
      {categoryPerformance.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} style={{ color: '#f59e0b' }} />
            <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>Category Performance</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryPerformance.slice(0, 8)} layout="vertical">
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} width={80} />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Accuracy']}
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', color: 'var(--color-text)' }}
              />
              <Bar dataKey="accuracy" fill="#6366f1" radius={[0, 6, 6, 0]} name="Accuracy %" />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div>
              <span style={{ color: 'var(--color-text-faint)' }}>Strongest: </span>
              <span className="font-semibold" style={{ color: '#10b981' }}>
                {categoryPerformance[0]?.category} ({categoryPerformance[0]?.accuracy}%)
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-faint)' }}>Needs work: </span>
              <span className="font-semibold" style={{ color: '#ef4444' }}>
                {categoryPerformance[categoryPerformance.length - 1]?.category} ({categoryPerformance[categoryPerformance.length - 1]?.accuracy}%)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
