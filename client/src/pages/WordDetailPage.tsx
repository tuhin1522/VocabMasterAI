import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Volume2, Heart, BookOpen, ArrowLeft, Star, Lightbulb,
  Loader2, CheckCircle2, RefreshCw, Edit3
} from 'lucide-react';
import { wordsAPI, favoritesAPI } from '../api/client';
import { Word, UserWord } from '../types';

export default function WordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [word, setWord] = useState<Word & { userWords?: UserWord[]; userSentences?: Array<{ id: string; sentence: string; aiScore?: number; aiFeedback?: string }> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    word: '', meaning: '', bengaliMeaning: '', partOfSpeech: 'noun', difficulty: 'B1', category: 'general',
    synonyms: '', antonyms: '', usageExplanation: '', mnemonic: '', examples: '',
    pronunciation: '', memoryAssociation: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    wordsAPI.getById(id).then((r) => {
      const d = r.data;
      setWord(d);
      setEditForm({
        word: d.word, meaning: d.meaning, bengaliMeaning: d.bengaliMeaning || '',
        partOfSpeech: d.partOfSpeech || 'noun', difficulty: d.difficulty || 'B1', category: d.category || 'general',
        synonyms: (d.synonyms || []).map((s: any) => s.text).join(', '),
        antonyms: (d.antonyms || []).map((a: any) => a.text).join(', '),
        usageExplanation: d.usageExplanation || '',
        mnemonic: d.mnemonic || '',
        memoryAssociation: d.memoryAssociation || '',
        pronunciation: d.pronunciation || '',
        examples: (d.examples || []).map((e: any) => e.sentence).join('\n')
      });
      setIsFavorite(d.isFavorite);
    }).finally(() => setLoading(false));
  }, [id]);

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.8;
      speechSynthesis.speak(u);
    }
  };

  const toggleFavorite = async () => {
    if (!word) return;
    setTogglingFav(true);
    try {
      if (isFavorite) { await favoritesAPI.remove(word.id); setIsFavorite(false); }
      else { await favoritesAPI.add(word.id); setIsFavorite(true); }
    } finally { setTogglingFav(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>;
  if (!word) return <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>Word not found.</div>;

  const userWord = word.userWords?.[0];

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word) return;
    setIsSaving(true);
    try {
      const payload = {
        ...editForm,
        synonyms: editForm.synonyms.split(',').map((s: string) => s.trim()).filter(Boolean),
        antonyms: editForm.antonyms.split(',').map((s: string) => s.trim()).filter(Boolean),
        examples: editForm.examples.split('\n').map((s: string) => s.trim()).filter(Boolean).map((s: string) => ({ sentence: s }))
      };
      const res = await wordsAPI.update(word.id, payload);
      setWord({ ...word, ...res.data });
      setIsEditing(false);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update word');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm transition-colors"
        style={{ color: 'var(--color-text-muted)' }}>
        <ArrowLeft size={16} /> Back
      </button>

      {/* Word header */}
      <div className="card" style={{ padding: '32px' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-5xl font-bold gradient-text">{word.word}</h1>
              <button onClick={() => speak(word.word)} className="p-2 rounded-xl"
                style={{ color: 'var(--color-primary-light)', background: 'rgba(99,102,241,0.1)' }}>
                <Volume2 size={22} />
              </button>
            </div>
            {word.pronunciation && (
              <p className="font-mono text-lg" style={{ color: 'var(--color-text-muted)' }}>{word.pronunciation}</p>
            )}
          </div>
          <div className="flex">
            <button onClick={toggleFavorite} disabled={togglingFav}
              className="p-3 rounded-xl transition-all"
              style={{ color: isFavorite ? '#ef4444' : 'var(--color-text-faint)', background: isFavorite ? 'rgba(239,68,68,0.1)' : 'var(--color-surface-2)' }}>
              {togglingFav ? <Loader2 size={20} className="animate-spin" /> : <Heart size={20} fill={isFavorite ? '#ef4444' : 'none'} />}
            </button>
            <button onClick={() => setIsEditing(!isEditing)}
              className="p-3 rounded-xl transition-all ml-2"
              style={{ color: isEditing ? 'var(--color-primary-light)' : 'var(--color-text-muted)', background: isEditing ? 'rgba(99,102,241,0.1)' : 'var(--color-surface-2)' }}>
              <Edit3 size={20} />
            </button>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="space-y-4 animate-fade-in mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-gray-500">Word</label><input value={editForm.word} onChange={e => setEditForm(p => ({...p, word: e.target.value}))} required /></div>
              <div><label className="text-sm text-gray-500">Pronunciation</label><input value={editForm.pronunciation} onChange={e => setEditForm(p => ({...p, pronunciation: e.target.value}))} /></div>
            </div>
            <div><label className="text-sm text-gray-500">Meaning</label><textarea value={editForm.meaning} onChange={e => setEditForm(p => ({...p, meaning: e.target.value}))} required rows={2}/></div>
            <div><label className="text-sm text-gray-500">Bengali Meaning</label><input value={editForm.bengaliMeaning} onChange={e => setEditForm(p => ({...p, bengaliMeaning: e.target.value}))} /></div>
            <div><label className="text-sm text-gray-500">Usage Explanation</label><textarea value={editForm.usageExplanation} onChange={e => setEditForm(p => ({...p, usageExplanation: e.target.value}))} rows={2}/></div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-500">Part of Speech</label>
                <select value={editForm.partOfSpeech} onChange={e => setEditForm(p => ({...p, partOfSpeech: e.target.value}))}>
                  <option value="noun">Noun</option><option value="verb">Verb</option><option value="adjective">Adjective</option><option value="adverb">Adverb</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-500">Difficulty</label>
                <select value={editForm.difficulty} onChange={e => setEditForm(p => ({...p, difficulty: e.target.value}))}>
                  <option value="A1">A1</option><option value="A2">A2</option><option value="B1">B1</option><option value="B2">B2</option><option value="C1">C1</option><option value="C2">C2</option>
                </select>
              </div>
              <div><label className="text-sm text-gray-500">Category</label><input value={editForm.category} onChange={e => setEditForm(p => ({...p, category: e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-gray-500">Synonyms (comma-separated)</label><input value={editForm.synonyms} onChange={e => setEditForm(p => ({...p, synonyms: e.target.value}))} /></div>
              <div><label className="text-sm text-gray-500">Antonyms (comma-separated)</label><input value={editForm.antonyms} onChange={e => setEditForm(p => ({...p, antonyms: e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm text-gray-500">Mnemonic / Memory Hook</label><input value={editForm.mnemonic} onChange={e => setEditForm(p => ({...p, mnemonic: e.target.value}))} /></div>
              <div><label className="text-sm text-gray-500">Memory Association / Visual</label><input value={editForm.memoryAssociation} onChange={e => setEditForm(p => ({...p, memoryAssociation: e.target.value}))} /></div>
            </div>
            <div><label className="text-sm text-gray-500">Example Sentences (one per line)</label><textarea value={editForm.examples} onChange={e => setEditForm(p => ({...p, examples: e.target.value}))} rows={3}/></div>
            <div className="flex gap-3 pt-2">
              <button type="button" className="btn btn-secondary flex-1" onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary flex-1" disabled={isSaving}>
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`badge diff-${word.difficulty}`}>{word.difficulty}</span>
          <span className="badge" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>{word.partOfSpeech}</span>
          <span className="badge" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>{word.category}</span>
          {userWord && <span className={`badge status-${userWord.status}`}>{userWord.status}</span>}
        </div>

        {/* Mastery bar */}
        {userWord && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Mastery Level</span>
              <span className="text-sm font-bold" style={{ color: 'var(--color-primary-light)' }}>{userWord.masteryLevel}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${userWord.masteryLevel}%` }} />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-text-faint)' }}>MEANING</div>
            <p className="text-lg font-medium" style={{ color: 'var(--color-text)' }}>{word.meaning}</p>
          </div>
          {word.bengaliMeaning && (
            <div>
              <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-text-faint)' }}>বাংলা অর্থ</div>
              <p style={{ color: 'var(--color-text)' }}>{word.bengaliMeaning}</p>
            </div>
          )}
          {word.usageExplanation && (
            <div>
              <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-text-faint)' }}>USAGE</div>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{word.usageExplanation}</p>
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* Synonyms & Antonyms */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { title: 'SYNONYMS', items: word.synonyms, bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', color: 'var(--color-primary-light)' },
          { title: 'ANTONYMS', items: word.antonyms, bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', color: '#ef4444' },
        ].map(({ title, items, bg, border, color }) => (
          <div key={title} className="card" style={{ padding: '16px', background: bg, borderColor: border }}>
            <div className="text-xs font-bold mb-3" style={{ color }}>{title}</div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((item) => (
                <span key={item.id} className="badge" style={{ background: bg, color, border: `1px solid ${border}`, fontSize: '12px' }}>
                  {item.text}
                </span>
              ))}
              {items.length === 0 && <span style={{ color: 'var(--color-text-faint)', fontSize: '13px' }}>None recorded</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Mnemonic */}
      {word.mnemonic && (
        <div className="card" style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={18} style={{ color: '#f59e0b' }} />
            <span className="font-bold" style={{ color: '#f59e0b' }}>AI Mnemonic</span>
          </div>
          <p style={{ color: 'var(--color-text)' }}>{word.mnemonic}</p>
          {word.memoryAssociation && (
            <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
              🖼️ {word.memoryAssociation}
            </p>
          )}
        </div>
      )}

      {/* Examples */}
      {word.examples.length > 0 && (
        <div className="card">
          <div className="text-xs font-bold mb-3" style={{ color: 'var(--color-text-faint)' }}>EXAMPLE SENTENCES</div>
          <div className="space-y-3">
            {word.examples.map((ex) => (
              <div key={ex.id} className="flex gap-3 items-start">
                <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: 'var(--color-primary)' }} />
                <div>
                  <p className="text-sm" style={{ color: 'var(--color-text)' }}>"{ex.sentence}"</p>
                  {ex.context && (
                    <span className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{ex.context}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User sentences */}
      {word.userSentences && word.userSentences.length > 0 && (
        <div className="card">
          <div className="text-xs font-bold mb-3" style={{ color: 'var(--color-text-faint)' }}>YOUR SENTENCES</div>
          <div className="space-y-3">
            {word.userSentences.map((s) => (
              <div key={s.id} className="p-3 rounded-xl" style={{ background: 'var(--color-surface-2)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>"{s.sentence}"</p>
                {s.aiScore !== undefined && (
                  <div className="flex items-center gap-2 mt-1">
                    {s.aiScore >= 70 ? <CheckCircle2 size={13} style={{ color: '#10b981' }} /> : <Star size={13} style={{ color: '#f59e0b' }} />}
                    <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Score: {s.aiScore}/100</span>
                    {s.aiFeedback && <span className="text-xs" style={{ color: 'var(--color-text-faint)' }}>· {s.aiFeedback}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning stats */}
      {userWord && (
        <div className="card">
          <div className="text-xs font-bold mb-3" style={{ color: 'var(--color-text-faint)' }}>LEARNING STATS</div>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Reviews', value: userWord.reviewCount },
              { label: 'Correct', value: userWord.correctCount, color: '#10b981' },
              { label: 'Incorrect', value: userWord.incorrectCount, color: '#ef4444' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="text-2xl font-bold" style={{ color: color || 'var(--color-text)' }}>{value}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-faint)' }}>{label}</div>
              </div>
            ))}
          </div>
          {userWord.nextReviewAt && (
            <p className="text-xs text-center mt-3" style={{ color: 'var(--color-text-faint)' }}>
              Next review: {new Date(userWord.nextReviewAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button className="btn btn-secondary flex-1" onClick={() => navigate('/vocabulary')}>
          <BookOpen size={16} /> Back to Vocabulary
        </button>
        <button className="btn btn-primary flex-1" onClick={() => navigate('/revision')}>
          <RefreshCw size={16} /> Practice This Word
        </button>
      </div>
    </div>
  );
}
