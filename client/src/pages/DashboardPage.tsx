import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, RefreshCw, Zap, Trophy, BarChart2, Target,
  Lock, CheckCircle2, Flame, TrendingUp, Brain, ArrowRight, Loader2
} from 'lucide-react';
import { dashboardAPI } from '../api/client';
import { DashboardData } from '../types';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    dashboardAPI.get().then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner w-8 h-8" />
    </div>
  );

  if (!data) return <div style={{ color: 'var(--color-text-muted)' }}>Failed to load dashboard.</div>;

  const { today, stats, weeklyProgress, user } = data;
  const revisionPct = today.revisionProgress.total > 0
    ? (today.revisionProgress.completed / today.revisionProgress.total) * 100 : 0;
  const newWordsPct = (today.newWordsProgress.completed / user.dailyWordTarget) * 100;

  const chartData = weeklyProgress.map((d) => ({
    day: new Date(d.date).toLocaleDateString('en', { weekday: 'short' }),
    words: d.wordsLearned,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Good {getGreeting()}, {user.name.split(' ')[0]}! 👋
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '4px' }}>
            {today.pendingRevisions > 0
              ? `⚡ You have ${today.pendingRevisions} words waiting for revision`
              : '✨ All caught up! Ready to learn new words.'}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <Flame size={18} style={{ color: '#f59e0b' }} />
          <span className="font-bold" style={{ color: '#f59e0b' }}>
            {stats.currentStreak} Day Streak
          </span>
        </div>
      </div>

      {/* Today's plan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revision card */}
        <div className="card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8"
            style={{ background: 'rgba(99,102,241,0.08)' }} />
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw size={16} style={{ color: 'var(--color-primary-light)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  Today's Revision
                </span>
              </div>
              <div className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
                {today.revisionProgress.completed}
                <span className="text-lg font-normal" style={{ color: 'var(--color-text-faint)' }}>
                  /{today.revisionProgress.total}
                </span>
              </div>
            </div>
            {today.revisionCompleted
              ? <CheckCircle2 size={28} style={{ color: '#10b981' }} />
              : <span className="badge status-weak">Pending</span>}
          </div>
          <div className="progress-bar mb-4">
            <div className="progress-fill" style={{ width: `${revisionPct}%` }} />
          </div>
          {today.pendingRevisions > 0 && !today.revisionCompleted ? (
            <button className="btn btn-primary w-full" onClick={() => navigate('/revision')}>
              <RefreshCw size={16} /> Start Revision
              <ArrowRight size={16} />
            </button>
          ) : today.revisionCompleted ? (
            <div className="text-sm font-medium" style={{ color: '#10b981' }}>
              ✅ Revision complete!
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--color-text-faint)' }}>
              No revisions pending today.
            </div>
          )}
        </div>

        {/* New Words card */}
        <div className="card relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full -translate-y-8 translate-x-8"
            style={{ background: today.newWordsLocked ? 'rgba(71,85,105,0.08)' : 'rgba(16,185,129,0.08)' }} />
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {today.newWordsLocked ? <Lock size={16} style={{ color: 'var(--color-text-faint)' }} /> : <BookOpen size={16} style={{ color: '#10b981' }} />}
                <span className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  New Words
                </span>
              </div>
              <div className="text-3xl font-bold" style={{ color: today.newWordsLocked ? 'var(--color-text-faint)' : 'var(--color-text)' }}>
                {today.newWordsLocked ? '—' : today.newWordsProgress.completed}
                {!today.newWordsLocked && (
                  <span className="text-lg font-normal" style={{ color: 'var(--color-text-faint)' }}>
                    /{user.dailyWordTarget}
                  </span>
                )}
              </div>
            </div>
            {today.newWordsCompleted
              ? <CheckCircle2 size={28} style={{ color: '#10b981' }} />
              : today.newWordsLocked
                ? <Lock size={28} style={{ color: 'var(--color-text-faint)' }} />
                : <span className="badge status-learning">In Progress</span>}
          </div>
          <div className="progress-bar mb-4">
            <div className="progress-fill" style={{
              width: today.newWordsLocked ? '0%' : `${newWordsPct}%`,
              background: today.newWordsLocked
                ? 'var(--color-border)'
                : 'linear-gradient(90deg, #10b981, #06b6d4)',
            }} />
          </div>
          {today.newWordsLocked ? (
            <div className="text-sm" style={{ color: 'var(--color-text-faint)' }}>
              🔒 Complete revision to unlock new words.
            </div>
          ) : today.newWordsCompleted ? (
            <div className="text-sm font-medium" style={{ color: '#10b981' }}>
              🎉 Daily goal complete! Amazing work!
            </div>
          ) : (
            <button className="btn btn-primary w-full"
              style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
              onClick={() => navigate('/learn')}>
              <BookOpen size={16} /> Continue Learning
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Words Learned', value: stats.totalLearned, icon: BookOpen, color: '#6366f1' },
          { label: 'Words Mastered', value: stats.totalMastered, icon: Brain, color: '#10b981' },
          { label: 'Accuracy', value: `${stats.accuracy}%`, icon: Target, color: '#f59e0b' },
          { label: 'Best Streak', value: `${stats.longestStreak}d`, icon: Trophy, color: '#ef4444' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '20px' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}20` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Weekly chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} style={{ color: 'var(--color-primary-light)' }} />
            <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>Weekly Progress</h2>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorWords" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" stroke="var(--color-text-faint)" tick={{ fontSize: 12 }} />
            <YAxis stroke="var(--color-text-faint)" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px' }}
              labelStyle={{ color: 'var(--color-text)' }}
              itemStyle={{ color: 'var(--color-primary-light)' }}
            />
            <Area type="monotone" dataKey="words" stroke="#6366f1" strokeWidth={2}
              fill="url(#colorWords)" name="Words Learned" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Weak Words', icon: Zap, to: '/weak-words', color: '#ef4444' },
          { label: 'Challenges', icon: Trophy, to: '/challenges', color: '#f59e0b' },
          { label: 'Vocabulary', icon: BookOpen, to: '/vocabulary', color: '#6366f1' },
          { label: 'Analytics', icon: BarChart2, to: '/analytics', color: '#10b981' },
        ].map(({ label, icon: Icon, to, color }) => (
          <button key={label} className="card flex flex-col items-center gap-2 cursor-pointer transition-all hover:scale-105"
            style={{ padding: '20px', textAlign: 'center' }}
            onClick={() => navigate(to)}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${color}20` }}>
              <Icon size={20} style={{ color }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
