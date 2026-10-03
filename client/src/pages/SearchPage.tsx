import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Sparkles, BookOpen, Plus, Check } from 'lucide-react';
import { wordsAPI } from '../api/client';
import { Word } from '../types';

type SearchState = 'idle' | 'searching' | 'found' | 'not_found' | 'generating' | 'generated' | 'saving';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>('idle');
  const [foundWord, setFoundWord] = useState<Word | null>(null);
  const [generatedData, setGeneratedData] = useState<Partial<Word> & { synonyms?: string[]; antonyms?: string[]; examples?: Array<{ sentence: string; context: string }> } | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({ 
    word: '', meaning: '', bengaliMeaning: '', partOfSpeech: 'noun', 
    pronunciation: '', difficulty: 'B1', category: 'daily',
    mnemonic: '', memoryAssociation: '', usageExplanation: '',
    synonyms: '', antonyms: '', examples: '' 
  });
  const [customSubmitting, setCustomSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setState('searching');
    setError('');
    try {
      const res = await wordsAPI.searchByWord(query.trim());
      if (res.data.found) {
        setFoundWord(res.data.word);
        setState('found');
      } else {
        setState('not_found');
      }
    } catch {
      setError('Search failed. Please try again.');
      setState('idle');
    }
  };

  const handleGenerate = async () => {
    setState('generating');
    setError('');
    try {
      const res = await wordsAPI.generate(query.trim());
      if (res.data.generated) {
        setGeneratedData(res.data.data);
        setState('generated');
      } else {
        setFoundWord(res.data.word);
        setState('found');
      }
    } catch {
      setError('AI generation failed. Please check your Gemini API key.');
      setState('not_found');
    }
  };

  const handleSave = async () => {
    if (!generatedData) return;
    setState('saving');
    try {
      await wordsAPI.saveGenerated({
        ...generatedData,
        synonyms: generatedData.synonyms || [],
        antonyms: generatedData.antonyms || [],
        examples: generatedData.examples || [],
      });
      setSaved(true);
    } catch {
      setError('Failed to save. Word may already exist.');
    } finally {
      setState('generated');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>🔍 Search Vocabulary</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Search existing words or generate new vocabulary using AI.
        </p>
      </div>

      {/* Search input */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-faint)' }} />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setState('idle'); setSaved(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter an English word..."
            style={{ paddingLeft: '42px' }}
          />
        </div>
        <button className="btn btn-primary" onClick={handleSearch} disabled={state === 'searching' || !query.trim()}>
          {state === 'searching' && <Loader2 size={16} className="animate-spin" />}
          Search
        </button>
      </div>

      {error && (
        <div className="feedback-incorrect text-sm" style={{ color: '#ef4444' }}>{error}</div>
      )}

      {/* Found word */}
      {state === 'found' && foundWord && (
        <div className="card animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-3xl font-bold gradient-text">{foundWord.word}</h2>
              {foundWord.pronunciation && (
                <p className="font-mono text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{foundWord.pronunciation}</p>
              )}
            </div>
            <div className="flex gap-2">
              <span className={`badge diff-${foundWord.difficulty}`}>{foundWord.difficulty}</span>
              <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>{foundWord.partOfSpeech}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-text-faint)' }}>MEANING</div>
              <p style={{ color: 'var(--color-text)' }}>{foundWord.meaning}</p>
            </div>
            {foundWord.bengaliMeaning && (
              <div>
                <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-text-faint)' }}>বাংলা অর্থ</div>
                <p style={{ color: 'var(--color-text)' }}>{foundWord.bengaliMeaning}</p>
              </div>
            )}
            {foundWord.mnemonic && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-sm" style={{ color: '#f59e0b' }}>💡 {foundWord.mnemonic}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-primary-light)' }}>SYNONYMS</div>
                <div className="flex flex-wrap gap-1">
                  {foundWord.synonyms?.slice(0, 4).map((s) => (
                    <span key={s.id} className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary-light)', fontSize: '11px' }}>{s.text}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold mb-1" style={{ color: '#ef4444' }}>ANTONYMS</div>
                <div className="flex flex-wrap gap-1">
                  {foundWord.antonyms?.slice(0, 4).map((a) => (
                    <span key={a.id} className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '11px' }}>{a.text}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button className="btn btn-secondary flex-1" onClick={() => navigate(`/vocabulary/${foundWord.id}`)}>
              <BookOpen size={16} /> View Full Details
            </button>
          </div>
        </div>
      )}

      {/* Word not found */}
      {state === 'not_found' && (
        <div className="card text-center animate-fade-in" style={{ padding: '40px 24px' }}>
          <div className="text-5xl mb-4">🤖</div>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            "{query}" not found in database
          </h3>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
            Would you like to generate complete vocabulary information using AI?
          </p>
          <button className="btn btn-primary" onClick={handleGenerate}>
            <Sparkles size={16} /> Generate with AI
          </button>
        </div>
      )}

      {/* Generating */}
      {state === 'generating' && (
        <div className="card text-center animate-fade-in" style={{ padding: '40px 24px' }}>
          <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: 'var(--color-primary)' }} />
          <h3 className="font-bold" style={{ color: 'var(--color-text)' }}>AI is generating vocabulary data...</h3>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
            Creating meaning, mnemonic, examples, Bengali translation, and more.
          </p>
        </div>
      )}

      {/* Generated data */}
      {(state === 'generated' || state === 'saving') && generatedData && (
        <div className="card animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} style={{ color: '#f59e0b' }} />
            <span className="font-bold" style={{ color: '#f59e0b' }}>AI Generated</span>
            {saved && (
              <span className="flex items-center gap-1 text-sm ml-auto" style={{ color: '#10b981' }}>
                <Check size={14} /> Saved to vocabulary!
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold gradient-text">{generatedData.word}</h2>
              {generatedData.pronunciation && (
                <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>{generatedData.pronunciation}</p>
              )}
              <span className={`badge diff-${generatedData.difficulty}`}>{generatedData.difficulty}</span>
            </div>

            <div>
              <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-text-faint)' }}>MEANING</div>
              <p style={{ color: 'var(--color-text)' }}>{generatedData.meaning}</p>
            </div>

            {generatedData.bengaliMeaning && (
              <div>
                <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-text-faint)' }}>বাংলা অর্থ</div>
                <p style={{ color: 'var(--color-text)' }}>{generatedData.bengaliMeaning}</p>
              </div>
            )}

            {generatedData.mnemonic && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p className="text-sm" style={{ color: '#f59e0b' }}>💡 {generatedData.mnemonic}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-primary-light)' }}>SYNONYMS</div>
                <div className="flex flex-wrap gap-1">
                  {generatedData.synonyms?.slice(0, 4).map((s: any, i) => (
                    <span key={i} className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary-light)', fontSize: '11px' }}>{typeof s === 'string' ? s : s?.text || ''}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold mb-1" style={{ color: '#ef4444' }}>ANTONYMS</div>
                <div className="flex flex-wrap gap-1">
                  {generatedData.antonyms?.slice(0, 4).map((a: any, i) => (
                    <span key={i} className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '11px' }}>{typeof a === 'string' ? a : a?.text || ''}</span>
                  ))}
                </div>
              </div>
            </div>

            {generatedData.examples && generatedData.examples.length > 0 && (
              <div>
                <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-text-faint)' }}>EXAMPLES</div>
                {generatedData.examples.slice(0, 2).map((ex, i) => (
                  <p key={i} className="text-sm" style={{ color: 'var(--color-text-muted)' }}>• "{ex.sentence}"</p>
                ))}
              </div>
            )}
          </div>

          {!saved && (
            <div className="flex gap-3 mt-4">
              <button className="btn btn-primary flex-1" onClick={handleSave} disabled={state === 'saving'}>
                {state === 'saving' && <Loader2 size={16} className="animate-spin" />}
                <Plus size={16} /> Save to My Vocabulary
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add custom word */}
      <div className="card" style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.2)' }}>
        <h3 className="font-bold mb-2" style={{ color: 'var(--color-text)' }}>Add Custom Vocabulary</h3>
        
        {!showCustomForm ? (
          <>
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Want to add a word with your own definition?
            </p>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCustomForm(true)}>
              <Plus size={14} /> Add Custom Word
            </button>
          </>
        ) : (
          <form onSubmit={async (e) => {
            e.preventDefault();
            setCustomSubmitting(true);
            try {
              const payload = {
                ...customForm,
                synonyms: customForm.synonyms.split(',').map(s => s.trim()).filter(Boolean),
                antonyms: customForm.antonyms.split(',').map(s => s.trim()).filter(Boolean),
                examples: customForm.examples.split('\n').map(s => s.trim()).filter(Boolean).map(s => ({ sentence: s })),
              };
              const res = await wordsAPI.create(payload);
              setShowCustomForm(false);
              setQuery(customForm.word);
              setFoundWord(res.data);
              setState('found');
              setCustomForm({ word: '', meaning: '', bengaliMeaning: '', partOfSpeech: 'noun', pronunciation: '', difficulty: 'B1', category: 'daily', mnemonic: '', memoryAssociation: '', usageExplanation: '', synonyms: '', antonyms: '', examples: '' });
            } catch (err: any) {
              alert(err.response?.data?.error || 'Failed to create word. It might already exist.');
            } finally {
              setCustomSubmitting(false);
            }
          }} className="space-y-3 mt-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Word" value={customForm.word} onChange={e => setCustomForm(p => ({...p, word: e.target.value}))} required />
              <input placeholder="Pronunciation (e.g. /wɜːd/)" value={customForm.pronunciation} onChange={e => setCustomForm(p => ({...p, pronunciation: e.target.value}))} />
            </div>
            <input placeholder="English Meaning" value={customForm.meaning} onChange={e => setCustomForm(p => ({...p, meaning: e.target.value}))} required />
            <input placeholder="Bengali Meaning (Optional)" value={customForm.bengaliMeaning} onChange={e => setCustomForm(p => ({...p, bengaliMeaning: e.target.value}))} />
            
            <div className="flex gap-2">
              <select value={customForm.partOfSpeech} onChange={e => setCustomForm(p => ({...p, partOfSpeech: e.target.value}))} style={{ flex: 1 }}>
                <option value="noun">Noun</option><option value="verb">Verb</option><option value="adjective">Adjective</option><option value="adverb">Adverb</option>
              </select>
              <select value={customForm.difficulty} onChange={e => setCustomForm(p => ({...p, difficulty: e.target.value}))} style={{ flex: 1 }}>
                <option value="A1">A1</option><option value="A2">A2</option><option value="B1">B1</option><option value="B2">B2</option><option value="C1">C1</option><option value="C2">C2</option>
              </select>
              <input placeholder="Category (e.g. daily)" value={customForm.category} onChange={e => setCustomForm(p => ({...p, category: e.target.value}))} style={{ flex: 1 }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Synonyms (comma-separated)" value={customForm.synonyms} onChange={e => setCustomForm(p => ({...p, synonyms: e.target.value}))} />
              <input placeholder="Antonyms (comma-separated)" value={customForm.antonyms} onChange={e => setCustomForm(p => ({...p, antonyms: e.target.value}))} />
            </div>

            <input placeholder="Usage Explanation (Optional)" value={customForm.usageExplanation} onChange={e => setCustomForm(p => ({...p, usageExplanation: e.target.value}))} />
            <input placeholder="Mnemonic / Memory Hook (Optional)" value={customForm.mnemonic} onChange={e => setCustomForm(p => ({...p, mnemonic: e.target.value}))} />
            <input placeholder="Memory Association (Optional)" value={customForm.memoryAssociation} onChange={e => setCustomForm(p => ({...p, memoryAssociation: e.target.value}))} />
            <textarea placeholder="Example Sentences (one per line)" value={customForm.examples} onChange={e => setCustomForm(p => ({...p, examples: e.target.value}))} rows={3} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'transparent' }} />
            <div className="flex gap-2 pt-2">
              <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowCustomForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary flex-1" disabled={customSubmitting}>
                {customSubmitting ? <Loader2 size={14} className="animate-spin"/> : 'Save Word'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
