import { useState } from 'react';
import { User, Settings, Globe, BookOpen, Loader2, Check } from 'lucide-react';
import { userAPI } from '../api/client';
import { useAuthStore } from '../store/authStore';

const DAILY_TARGETS = [5, 10, 15, 20, 30];
const LANGUAGES: { value: 'english' | 'bengali' | 'both'; label: string }[] = [
  { value: 'english', label: 'English Only' },
  { value: 'bengali', label: 'বাংলা Only' },
  { value: 'both', label: 'English + বাংলা' },
];

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: user?.name || '',
    dailyWordTarget: user?.dailyWordTarget || 10,
    preferredLanguage: user?.preferredLanguage || 'english',
  });

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const res = await userAPI.updateSettings(form);
      updateUser(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings.');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Profile & Settings</h1>
      </div>

      {/* Profile card */}
      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{user?.name}</div>
            <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>@{user?.username}</div>
            <div className="text-sm" style={{ color: 'var(--color-text-faint)' }}>{user?.email}</div>
          </div>
          {user?.role === 'admin' && (
            <span className="badge ml-auto" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--color-primary-light)' }}>
              Admin
            </span>
          )}
        </div>

        <div className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
          Member since {new Date(user?.createdAt || '').toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Settings */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Settings size={18} style={{ color: 'var(--color-primary-light)' }} />
          <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>Learning Settings</h2>
        </div>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
              <User size={14} className="inline mr-1" /> Full Name
            </label>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" />
          </div>

          {/* Daily target */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>
              <BookOpen size={14} className="inline mr-1" /> Daily Word Target
            </label>
            <div className="grid grid-cols-5 gap-2">
              {DAILY_TARGETS.map((n) => (
                <button key={n} type="button"
                  className="py-2.5 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: form.dailyWordTarget === n ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--color-surface-2)',
                    color: form.dailyWordTarget === n ? 'white' : 'var(--color-text-muted)',
                    border: form.dailyWordTarget === n ? 'none' : '1px solid var(--color-border)',
                  }}
                  onClick={() => setForm((p) => ({ ...p, dailyWordTarget: n }))}>
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-faint)' }}>
              Current: {form.dailyWordTarget} words/day
            </p>
          </div>

          {/* Language preference */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-text-muted)' }}>
              <Globe size={14} className="inline mr-1" /> Explanation Language
            </label>
            <div className="space-y-2">
              {LANGUAGES.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                  style={{
                    background: form.preferredLanguage === value ? 'rgba(99,102,241,0.1)' : 'var(--color-surface-2)',
                    border: form.preferredLanguage === value ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--color-border)',
                  }}>
                  <input type="radio" name="language" value={value} checked={form.preferredLanguage === value}
                    onChange={() => setForm((p) => ({ ...p, preferredLanguage: value }))}
                    className="hidden" />
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${form.preferredLanguage === value ? 'border-indigo-500' : 'border-slate-600'}`}>
                    {form.preferredLanguage === value && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                  </div>
                  <span className="font-medium" style={{ color: form.preferredLanguage === value ? 'var(--color-primary-light)' : 'var(--color-text)' }}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="feedback-incorrect text-sm mt-4" style={{ color: '#ef4444' }}>{error}</div>}

        <button className="btn btn-primary w-full mt-6" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saved ? <><Check size={16} /> Saved!</> : saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
