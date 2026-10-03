import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, RefreshCw, ChevronRight, Target } from 'lucide-react';
import { wordsAPI } from '../api/client';
import { UserWord } from '../types';

export default function WeakWordsPage() {
  const [weakWords, setWeakWords] = useState<UserWord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    wordsAPI.getWeak().then((r) => setWeakWords(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            ⚡ Weak Words
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Words that need extra practice — {weakWords.length} words identified
          </p>
        </div>
        {weakWords.length > 0 && (
          <button className="btn btn-primary" onClick={() => navigate('/revision')}>
            <RefreshCw size={16} /> Practice Now
          </button>
        )}
      </div>

      {weakWords.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">💪</div>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>No weak words!</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>
            You're doing great! All your words are in good shape.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {weakWords.map((uw) => (
            <div key={uw.id} className="card cursor-pointer group"
              style={{ padding: '20px', borderColor: 'rgba(239,68,68,0.2)' }}
              onClick={() => navigate(`/vocabulary/${uw.word.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{uw.word.word}</h3>
                  {uw.word.pronunciation && (
                    <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{uw.word.pronunciation}</p>
                  )}
                </div>
                <ChevronRight size={16} style={{ color: 'var(--color-text-faint)' }} className="group-hover:translate-x-1 transition-transform" />
              </div>

              <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{uw.word.meaning}</p>

              {/* Mastery bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <Target size={12} style={{ color: '#ef4444' }} />
                    <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Mastery</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: '#ef4444' }}>{uw.masteryLevel}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${uw.masteryLevel}%`,
                    background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                  }} />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="badge status-weak">{uw.status}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
                  {uw.incorrectCount} incorrect · {uw.correctCount} correct · {uw.hintCount} hints
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {weakWords.length > 0 && (
        <div className="card text-center" style={{ padding: '24px', background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
          <Zap size={28} className="mx-auto mb-3" style={{ color: '#ef4444' }} />
          <h3 className="font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Ready to strengthen these words?
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
            These words are scheduled for extra revision automatically. Practice them more to boost mastery.
          </p>
          <button className="btn btn-danger" onClick={() => navigate('/revision')}>
            <RefreshCw size={16} /> Start Revision Session
          </button>
        </div>
      )}
    </div>
  );
}
