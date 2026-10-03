import { useEffect, useState } from 'react';
import { Shield, Users, BookOpen, BarChart2, Loader2, Trash2, RefreshCw, Download, Upload } from 'lucide-react';
import { adminAPI } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

interface AdminStats { totalUsers: number; totalWords: number; totalAttempts: number; totalSessions: number; }

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; username: string; name: string; email: string; role: string; createdAt: string; _count: { userWords: number; reviewAttempts: number } }>>([]);
  const [words, setWords] = useState<Array<{ id: string; word: string; difficulty: string; category: string; isApproved: boolean; _count: { userWords: number } }>>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'words'>('stats');
  const [loading, setLoading] = useState(true);
  const [deletingWord, setDeletingWord] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/dashboard'); return; }
    setLoading(true);
    Promise.all([
      adminAPI.getStats(),
      adminAPI.getUsers(),
      adminAPI.getWords(),
    ]).then(([s, u, w]) => {
      setStats(s.data);
      setUsers(u.data);
      setWords(w.data);
    }).finally(() => setLoading(false));
  }, [user, navigate]);

  const handleDeleteWord = async (id: string) => {
    if (!confirm('Delete this word? This cannot be undone.')) return;
    setDeletingWord(id);
    await adminAPI.deleteWord(id);
    setWords((prev) => prev.filter((w) => w.id !== id));
    setDeletingWord(null);
  };

  const handleRegenerateWord = async (id: string) => {
    setRegenerating(id);
    try {
      await adminAPI.regenerateWord(id);
      alert('AI content regenerated successfully!');
    } catch { alert('Failed to regenerate. Check Gemini API key.'); }
    finally { setRegenerating(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="spinner w-8 h-8" />
    </div>
  );

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Shield size={20} style={{ color: 'var(--color-primary-light)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Admin Panel</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>VocabMaster AI Administration</p>
          </div>
          <button className="btn btn-secondary btn-sm ml-auto" onClick={() => navigate('/dashboard')}>
            ← Back to App
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-xl w-fit" style={{ background: 'var(--color-surface)' }}>
          {[
            { id: 'stats', label: 'Overview', icon: BarChart2 },
            { id: 'users', label: `Users (${users.length})`, icon: Users },
            { id: 'words', label: `Words (${words.length})`, icon: BookOpen },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: activeTab === id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
                color: activeTab === id ? 'white' : 'var(--color-text-muted)',
              }}
              onClick={() => setActiveTab(id as typeof activeTab)}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Stats */}
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Users', value: stats.totalUsers, icon: Users, color: '#6366f1' },
              { label: 'Total Words', value: stats.totalWords, icon: BookOpen, color: '#10b981' },
              { label: 'Total Attempts', value: stats.totalAttempts, icon: BarChart2, color: '#f59e0b' },
              { label: 'Sessions Done', value: stats.totalSessions, icon: RefreshCw, color: '#06b6d4' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card" style={{ padding: '24px' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                </div>
                <div className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)' }}>
                    {['User', 'Email', 'Role', 'Words', 'Attempts', 'Joined'].map((h) => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div className="font-semibold" style={{ color: 'var(--color-text)' }}>{u.name}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-faint)' }}>@{u.username}</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', fontSize: '14px' }}>{u.email}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${u.role === 'admin' ? 'status-strong' : 'status-new'}`}>{u.role}</span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', fontSize: '14px' }}>{u._count.userWords}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', fontSize: '14px' }}>{u._count.reviewAttempts}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--color-text-faint)', fontSize: '13px' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Words */}
        {activeTab === 'words' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {words.length} vocabulary words
              </span>
              <div className="flex gap-2 ml-auto">
                <button className="btn btn-secondary btn-sm">
                  <Download size={14} /> Export CSV
                </button>
                <button className="btn btn-primary btn-sm">
                  <Upload size={14} /> Import CSV
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)' }}>
                    {['Word', 'Difficulty', 'Category', 'Learners', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {words.map((w) => (
                    <tr key={w.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{w.word}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge diff-${w.difficulty}`}>{w.difficulty}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '13px' }}>{w.category}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: '13px' }}>{w._count.userWords}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${w.isApproved ? 'status-strong' : 'status-weak'}`}>
                          {w.isApproved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleRegenerateWord(w.id)}
                            disabled={regenerating === w.id}
                            title="Regenerate AI content">
                            {regenerating === w.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteWord(w.id)}
                            disabled={deletingWord === w.id}
                            title="Delete word">
                            {deletingWord === w.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
