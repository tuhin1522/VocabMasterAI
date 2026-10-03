import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Zap, Brain, Target, Loader2 } from 'lucide-react';
import { authAPI } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { User } from '../types';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [form, setForm] = useState({
    name: '', username: ''
  });

  const set = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.login(form.name, form.username);
      login(res.data.user as User, res.data.token);
      navigate('/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-stretch" style={{ background: 'var(--color-bg)' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 w-1/2"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 50%, rgba(6,182,212,0.1) 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >V</div>
          <span className="text-xl font-bold gradient-text">VocabMaster AI</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold mb-6 leading-tight" style={{ color: 'var(--color-text)' }}>
            Master English Vocabulary with{' '}
            <span className="gradient-text">AI-Powered Learning</span>
          </h1>
          <p className="text-lg mb-8" style={{ color: 'var(--color-text-muted)' }}>
            Active recall, spaced repetition, AI mnemonics, and Bengali support — everything you need to master vocabulary.
          </p>

          <div className="space-y-4">
            {[
              { icon: Brain, text: 'AI-generated mnemonics for every word' },
              { icon: Target, text: 'Spaced repetition system for maximum retention' },
              { icon: Zap, text: 'Active recall over passive reading' },
              { icon: BookOpen, text: 'Bengali meaning & explanation support' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(99,102,241,0.15)' }}
                >
                  <Icon size={16} style={{ color: 'var(--color-primary-light)' }} />
                </div>
                <span style={{ color: 'var(--color-text-muted)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ color: 'var(--color-text-faint)', fontSize: '13px' }}>
          © 2024 VocabMaster AI. Built for serious learners.
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >V</div>
            <span className="text-xl font-bold gradient-text">VocabMaster AI</span>
          </div>

          <div className="card">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Welcome</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Enter your details to sign in or create a new account instantly.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Full Name
                </label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)}
                  placeholder="Your full name" required />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Username
                </label>
                <input value={form.username} onChange={(e) => set('username', e.target.value)}
                  placeholder="your_username" required />
              </div>

              {error && (
                <div className="feedback-incorrect text-sm" style={{ color: '#ef4444' }}>
                  {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Please wait...' : 'Continue'}
              </button>
            </form>

            <div className="mt-4 text-center text-sm" style={{ color: 'var(--color-text-faint)' }}>
              Demo: Name: <span style={{ color: 'var(--color-primary-light)' }}>Demo</span>{' '}
              / Username: <span style={{ color: 'var(--color-primary-light)' }}>demo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
