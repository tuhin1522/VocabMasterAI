import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, CheckCircle2, XCircle, HelpCircle, ArrowRight,
  Loader2, Volume2, ChevronRight, Eye
} from 'lucide-react';
import { revisionAPI } from '../api/client';
import { RevisionQuestion, Word } from '../types';

type AnswerState = 'idle' | 'submitted' | 'hint';

export default function RevisionPage() {
  const [data, setData] = useState<{ hasRevision: boolean; pendingCount?: number; words?: RevisionQuestion[]; message?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);
  const [mcqOptions, setMcqOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    revisionAPI.getToday().then((r) => {
      setData(r.data);
      if (r.data.words?.length) generateMCQ(r.data.words[0]);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentQ = data?.words?.[currentIdx];
  const isMCQ = currentQ?.questionType?.startsWith('mcq_');
  const isFillBlank = currentQ?.questionType === 'fill_blank';

  function generateMCQ(q: RevisionQuestion) {
    if (!q.questionType.startsWith('mcq_')) return;
    const word = q.word;
    let correct = '';
    let pool: string[] = [];

    if (q.questionType === 'mcq_meaning') {
      correct = word.meaning;
    } else if (q.questionType === 'mcq_synonym') {
      correct = word.synonyms[0]?.text || word.meaning;
    } else {
      correct = word.antonyms[0]?.text || word.meaning;
    }

    // Simple distractors from synonyms/antonyms of the word
    pool = [
      ...word.synonyms.map((s) => s.text),
      ...word.antonyms.map((a) => a.text),
    ].filter((w) => w !== correct).slice(0, 3);

    // Fill with generic distractors if needed
    while (pool.length < 3) pool.push(`Option ${pool.length + 2}`);

    const options = [correct, ...pool.slice(0, 3)].sort(() => Math.random() - 0.5);
    setMcqOptions(options);
  }

  const getQuestionPrompt = (q: RevisionQuestion) => {
    const w = q.word;
    switch (q.questionType) {
      case 'meaning': return { prompt: `What does "${w.word}" mean?`, placeholder: 'Type the meaning...' };
      case 'reverse': return { prompt: `Which word means: "${w.meaning}"?`, placeholder: 'Type the word...' };
      case 'synonym': return { prompt: `Give a synonym for "${w.word}"`, placeholder: 'Type a synonym...' };
      case 'antonym': return { prompt: `Give an antonym for "${w.word}"`, placeholder: 'Type an antonym...' };
      case 'fill_blank': return { prompt: getFillBlankSentence(w), placeholder: 'Fill in the blank...' };
      case 'mcq_meaning': return { prompt: `What does "${w.word}" mean?`, placeholder: '' };
      case 'mcq_synonym': return { prompt: `Choose a synonym for "${w.word}"`, placeholder: '' };
      case 'mcq_antonym': return { prompt: `Choose an antonym for "${w.word}"`, placeholder: '' };
      case 'sentence': return { prompt: `Use "${w.word}" in a sentence`, placeholder: `Write a sentence with "${w.word}"...` };
      default: return { prompt: `What does "${w.word}" mean?`, placeholder: 'Type the meaning...' };
    }
  };

  function getFillBlankSentence(word: Word) {
    const ex = word.examples[0];
    if (ex) {
      const re = new RegExp(word.word, 'gi');
      return `Fill in the blank: "${ex.sentence.replace(re, '______')}"`;
    }
    return `Fill in the blank: "She was ______ to accept the offer."`;
  }

  const checkAnswerLocally = (q: RevisionQuestion, ans: string): { correct: boolean; score: number } => {
    const w = q.word;
    const a = ans.trim().toLowerCase();

    if (!a) return { correct: false, score: 0 };

    switch (q.questionType) {
      case 'reverse': return { correct: w.word.toLowerCase().includes(a), score: w.word.toLowerCase().includes(a) ? 100 : 0 };
      case 'synonym': {
        const syns = w.synonyms.map((s) => s.text.toLowerCase());
        const matched = syns.some((s) => s.includes(a) || a.includes(s));
        return { correct: matched, score: matched ? 90 : 30 };
      }
      case 'antonym': {
        const ants = w.antonyms.map((a2) => a2.text.toLowerCase());
        const matched = ants.some((ant) => ant.includes(a) || a.includes(ant));
        return { correct: matched, score: matched ? 90 : 30 };
      }
      case 'fill_blank': return { correct: a.includes(w.word.toLowerCase()), score: a.includes(w.word.toLowerCase()) ? 100 : 0 };
      default: {
        const meaningWords = w.meaning.toLowerCase().split(/\s+/);
        const ansWords = a.split(/\s+/);
        const overlap = ansWords.filter((w2) => meaningWords.some((m) => m.includes(w2) || w2.includes(m)));
        const score2 = Math.min(100, (overlap.length / Math.max(meaningWords.length * 0.4, 1)) * 100);
        return { correct: score2 >= 50, score: Math.round(score2) };
      }
    }
  };

  const handleSubmit = () => {
    if (!currentQ) return;
    const ans = isMCQ ? selectedOption : userAnswer;
    const { correct, score: s } = checkAnswerLocally(currentQ, ans);
    setIsCorrect(correct);
    setScore(s);
    setAnswerState('submitted');
  };

  const handleHint = () => {
    setIsCorrect(false);
    setScore(0);
    setAnswerState('hint');
  };

  const handleNext = async () => {
    if (!currentQ) return;
    setSubmitting(true);
    const ans = isMCQ ? selectedOption : userAnswer;
    try {
      const res = await revisionAPI.submitAnswer({
        wordId: currentQ.word.id,
        questionType: currentQ.questionType,
        userAnswer: ans,
        isCorrect,
        score,
        hintUsed: answerState === 'hint',
      });
      setSessionScore(res.data.sessionScore || 0);

      if (res.data.revisionCompleted) {
        load();
        return;
      }

      const nextIdx = currentIdx + 1;
      if (data?.words && nextIdx >= data.words.length) {
        load();
        setCurrentIdx(0);
      } else {
        setCurrentIdx(nextIdx);
        if (data?.words?.[nextIdx]) generateMCQ(data.words[nextIdx]);
      }
      setUserAnswer('');
      setSelectedOption('');
      setAnswerState('idle');
    } finally {
      setSubmitting(false);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.8;
      speechSynthesis.speak(u);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>
  );

  if (!data?.hasRevision) return (
    <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
      <div className="text-6xl">✅</div>
      <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>No Revisions Pending!</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>{data?.message || 'You\'re all caught up! Time to learn new words.'}</p>
      <button className="btn btn-primary" onClick={() => navigate('/learn')}>
        Start Learning <ArrowRight size={16} />
      </button>
    </div>
  );

  if (!currentQ) return (
    <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
      <div className="text-6xl">🎊</div>
      <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Revision Complete!</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>Session score: {sessionScore}%</p>
      <button className="btn btn-primary" onClick={() => navigate('/learn')}>
        Learn New Words <ArrowRight size={16} />
      </button>
    </div>
  );

  const { prompt, placeholder } = getQuestionPrompt(currentQ);
  const total = data?.words?.length || 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            REVISION {currentIdx + 1} / {total}
          </span>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <RefreshCw size={14} style={{ color: '#f59e0b' }} />
            <span className="text-xs font-bold" style={{ color: '#f59e0b' }}>
              {data.pendingCount} pending
            </span>
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(currentIdx / total) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }} />
        </div>
      </div>

      {/* Question card */}
      <div className="card space-y-5">
        {/* Word display (for most types) */}
        {currentQ.questionType !== 'reverse' && (
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-1">
              <h2 className="text-4xl font-bold gradient-text">{currentQ.word.word}</h2>
              <button onClick={() => speak(currentQ.word.word)} className="p-2 rounded-xl"
                style={{ color: 'var(--color-primary-light)', background: 'rgba(99,102,241,0.1)' }}>
                <Volume2 size={18} />
              </button>
            </div>
            {currentQ.word.pronunciation && (
              <p className="font-mono text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {currentQ.word.pronunciation}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={`badge diff-${currentQ.word.difficulty}`}>{currentQ.word.difficulty}</span>
              <span className="badge status-${currentQ.userWord.status}">{currentQ.userWord.status}</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text-faint)' }}>
                Mastery: {currentQ.userWord.masteryLevel}%
              </span>
            </div>
          </div>
        )}

        {/* Question prompt */}
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{prompt}</p>
        </div>

        {/* Input area */}
        {answerState === 'idle' && (
          <div className="space-y-3">
            {isMCQ ? (
              <div className="grid grid-cols-2 gap-2">
                {mcqOptions.map((opt) => (
                  <button key={opt} onClick={() => setSelectedOption(opt)}
                    className="p-3 rounded-xl text-left text-sm font-medium transition-all"
                    style={{
                      background: selectedOption === opt ? 'rgba(99,102,241,0.15)' : 'var(--color-surface-2)',
                      border: selectedOption === opt ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--color-border)',
                      color: selectedOption === opt ? 'var(--color-primary-light)' : 'var(--color-text)',
                    }}>
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <input value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder={placeholder}
                autoFocus />
            )}

            <div className="flex gap-3">
              <button className="btn btn-secondary flex-1" onClick={handleHint}>
                <HelpCircle size={16} /> I don't know
              </button>
              <button className="btn btn-primary flex-1"
                onClick={handleSubmit}
                disabled={isMCQ ? !selectedOption : !userAnswer.trim()}>
                Submit <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {answerState !== 'idle' && (
          <div className="space-y-3 animate-fade-in">
            {answerState === 'submitted' && (
              <div className={isCorrect ? 'feedback-correct' : 'feedback-partial'}>
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect ? <CheckCircle2 size={18} style={{ color: '#10b981' }} /> : <XCircle size={18} style={{ color: '#f59e0b' }} />}
                  <span className="font-bold">{isCorrect ? '✓ Correct!' : '~ Partial Credit'}</span>
                  <span className="ml-auto font-bold" style={{ color: '#f59e0b' }}>{score}/100</span>
                </div>
                <p className="text-sm italic mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  Your answer: "{isMCQ ? selectedOption : userAnswer}"
                </p>
              </div>
            )}

            {answerState === 'hint' && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(71,85,105,0.1)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={16} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="font-bold text-sm" style={{ color: 'var(--color-text-muted)' }}>Answer Revealed</span>
                </div>
              </div>
            )}

            {/* Correct answer display */}
            <div className="p-4 rounded-xl space-y-2" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <div className="text-xs font-bold mb-1" style={{ color: 'var(--color-text-faint)' }}>CORRECT ANSWER</div>
              <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{currentQ.word.meaning}</p>
              {currentQ.word.bengaliMeaning && (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>বাংলা: {currentQ.word.bengaliMeaning}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {currentQ.word.synonyms.slice(0, 3).map((s) => (
                  <span key={s.id} className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary-light)', fontSize: '11px' }}>
                    {s.text}
                  </span>
                ))}
              </div>
              {currentQ.word.mnemonic && (
                <p className="text-xs mt-2 italic" style={{ color: '#f59e0b' }}>
                  💡 {currentQ.word.mnemonic}
                </p>
              )}
            </div>

            <button className="btn btn-primary w-full" onClick={handleNext} disabled={submitting}>
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? 'Saving...' : 'Next Question'}
              {!submitting && <ArrowRight size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
