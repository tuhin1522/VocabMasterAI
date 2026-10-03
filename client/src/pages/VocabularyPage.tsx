import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, BookOpen, Heart, Star, Loader2, ChevronRight } from 'lucide-react';
import { wordsAPI, favoritesAPI } from '../api/client';
import { Word } from '../types';

const DIFFICULTIES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const CATEGORIES = ['daily', 'academic', 'business', 'technology', 'ielts', 'communication', 'banking', 'job_interview'];
const STATUSES = ['new', 'learning', 'developing', 'strong', 'weak', 'mastered'];

export default function VocabularyPage() {
  const [words, setWords] = useState<Word[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'notebook' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [togglingFav, setTogglingFav] = useState<string | null>(null);
  const navigate = useNavigate();

  const limit = 20;

  const load = useCallback(() => {
    setLoading(true);
    const fn = activeTab === 'favorites'
      ? favoritesAPI.getAll().then((r) => ({ data: { words: r.data.map((f: { word: Word; wordId: string }) => f.word), total: r.data.length } }))
      : activeTab === 'notebook'
        ? wordsAPI.getNotebook({ page, limit }).then((r) => ({ data: { words: r.data.words.map((w: { word: Word }) => w.word), total: r.data.total } }))
        : wordsAPI.getAll({ search: search || undefined, category: category || undefined, difficulty: difficulty || undefined, status: status || undefined, page, limit }).then((r) => r);

    fn.then((r) => {
      setWords(r.data.words || []);
      setTotal(r.data.total || 0);
      const favIds = new Set<string>(r.data.words?.filter((w: Word) => w.isFavorite).map((w: Word) => w.id));
      setFavorites((prev) => new Set([...prev, ...favIds]));
    }).finally(() => setLoading(false));
  }, [search, category, difficulty, status, page, activeTab]);

  useEffect(() => { load(); }, [load]);

  const toggleFavorite = async (wordId: string) => {
    setTogglingFav(wordId);
    try {
      if (favorites.has(wordId)) {
        await favoritesAPI.remove(wordId);
        setFavorites((prev) => { const n = new Set(prev); n.delete(wordId); return n; });
      } else {
        await favoritesAPI.add(wordId);
        setFavorites((prev) => new Set([...prev, wordId]));
      }
    } finally {
      setTogglingFav(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Vocabulary</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {total} word{total !== 1 ? 's' : ''} found
          </p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/search')}>
          <Search size={14} /> Search & Add
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl w-fit" style={{ background: 'var(--color-surface-2)' }}>
        {[
          { id: 'all', label: 'All Words', icon: BookOpen },
          { id: 'notebook', label: 'My Learning', icon: Star },
          { id: 'favorites', label: 'Favorites', icon: Heart },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: activeTab === id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
              color: activeTab === id ? 'white' : 'var(--color-text-muted)',
            }}
            onClick={() => { setActiveTab(id as typeof activeTab); setPage(1); }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {activeTab === 'all' && (
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-faint)' }} />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search words..." style={{ paddingLeft: '36px' }} />
          </div>
          <select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setPage(1); }} style={{ width: 'auto', minWidth: '100px' }}>
            <option value="">All Levels</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} style={{ width: 'auto', minWidth: '120px' }}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ').toUpperCase()}</option>)}
          </select>
        </div>
      )}

      {/* Words grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card" style={{ padding: '20px' }}>
              <div className="skeleton h-6 w-32 mb-3" />
              <div className="skeleton h-4 w-full mb-2" />
              <div className="skeleton h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📚</div>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>No words found</h3>
          <p style={{ color: 'var(--color-text-muted)' }}>Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {words.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              isFavorite={favorites.has(word.id)}
              onToggleFav={() => toggleFavorite(word.id)}
              toggling={togglingFav === word.id}
              onClick={() => navigate(`/vocabulary/${word.id}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            ← Prev
          </button>
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function WordCard({ word, isFavorite, onToggleFav, toggling, onClick }: {
  word: Word;
  isFavorite: boolean;
  onToggleFav: () => void;
  toggling: boolean;
  onClick: () => void;
}) {
  return (
    <div className="card cursor-pointer group" style={{ padding: '20px' }} onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{word.word}</h3>
          {word.pronunciation && (
            <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{word.pronunciation}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: isFavorite ? '#ef4444' : 'var(--color-text-faint)', background: isFavorite ? 'rgba(239,68,68,0.1)' : 'transparent' }}
            disabled={toggling}>
            {toggling ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} fill={isFavorite ? '#ef4444' : 'none'} />}
          </button>
          <ChevronRight size={16} style={{ color: 'var(--color-text-faint)' }} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{word.meaning}</p>
      {word.bengaliMeaning && (
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-faint)' }}>বাংলা: {word.bengaliMeaning}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`badge diff-${word.difficulty}`}>{word.difficulty}</span>
        <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-faint)', fontSize: '11px' }}>
          {word.partOfSpeech}
        </span>
        {word.userStatus && (
          <span className={`badge status-${word.userStatus}`}>{word.userStatus}</span>
        )}
        {(word.masteryLevel ?? 0) > 0 && (
          <span className="text-xs ml-auto" style={{ color: 'var(--color-text-faint)' }}>
            {word.masteryLevel}% mastery
          </span>
        )}
      </div>
    </div>
  );
}
