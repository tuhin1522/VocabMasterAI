import { useState } from 'react';
import { Trophy, Timer, Zap, Brain, ArrowRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { challengeAPI } from '../api/client';
import { Word } from '../types';

type ChallengeType = 'meaning' | 'synonym' | 'antonym' | 'sentence' | 'mixed';

interface ChallengeResult {
  wordId: string;
  questionType: string;
  userAnswer: string;
  isCorrect: boolean;
  score: number;
}

type Phase = 'select' | 'playing' | 'complete';

export default function ChallengePage() {
  const [phase, setPhase] = useState<Phase>('select');
  const [challengeType, setChallengeType] = useState<ChallengeType>('mixed');
  const [wordCount, setWordCount] = useState(10);
  const [questions, setQuestions] = useState<Array<{ word: Word; questionType: string }>>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [results, setResults] = useState<ChallengeResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [timeTaken, setTimeTaken] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [finalScore, setFinalScore] = useState<{ score: number; correct: number; total: number } | null>(null);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const startChallenge = async () => {
    setLoading(true);
    try {
      const res = await challengeAPI.start(challengeType, wordCount);
      if (res.data.error) { alert(res.data.error); return; }
      setQuestions(res.data.questions);
      setCurrentIdx(0);
      setResults([]);
      setUserAnswer('');
      setPhase('playing');
      const now = Date.now();
      setStartTime(now);
      setTimeLeft(challengeType === 'mixed' ? 300 : 600);

      const t = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(t);
            completeChallenge([], now);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setTimer(t);
    } finally { setLoading(false); }
  };

  const checkAnswer = (word: Word, qType: string, ans: string): { correct: boolean; score: number } => {
    const a = ans.trim().toLowerCase();
    if (!a) return { correct: false, score: 0 };

    if (qType === 'meaning') {
      const meaningWords = word.meaning.toLowerCase().split(/\s+/);
      const ansWords = a.split(/\s+/);
      const overlap = ansWords.filter((w) => meaningWords.some((m) => m.includes(w) || w.includes(m)));
      const s = Math.min(100, (overlap.length / Math.max(meaningWords.length * 0.4, 1)) * 100);
      return { correct: s >= 50, score: Math.round(s) };
    }
    if (qType === 'synonym') {
      const syns = word.synonyms.map((s) => s.text.toLowerCase());
      const matched = syns.some((s) => s.includes(a) || a.includes(s));
      return { correct: matched, score: matched ? 100 : 20 };
    }
    if (qType === 'antonym') {
      const ants = word.antonyms.map((a2) => a2.text.toLowerCase());
      const matched = ants.some((ant) => ant.includes(a) || a.includes(ant));
      return { correct: matched, score: matched ? 100 : 20 };
    }
    return { correct: a.includes(word.word.toLowerCase()), score: a.includes(word.word.toLowerCase()) ? 100 : 0 };
  };

  const submitAnswer = () => {
    const q = questions[currentIdx];
    const { correct, score } = checkAnswer(q.word, q.questionType, userAnswer);
    const result: ChallengeResult = {
      wordId: q.word.id,
      questionType: q.questionType,
      userAnswer,
      isCorrect: correct,
      score,
    };

    const newResults = [...results, result];
    setResults(newResults);
    setUserAnswer('');

    if (currentIdx + 1 >= questions.length) {
      if (timer) clearInterval(timer);
      completeChallenge(newResults, startTime);
    } else {
      setCurrentIdx((i) => i + 1);
    }
  };

  const completeChallenge = async (r: ChallengeResult[], sTime: number) => {
    const taken = Math.round((Date.now() - sTime) / 1000);
    setTimeTaken(taken);
    try {
      const res = await challengeAPI.complete(r, taken);
      setFinalScore(res.data);
    } catch {
      setFinalScore({
        score: r.length > 0 ? Math.round(r.reduce((s, x) => s + x.score, 0) / r.length) : 0,
        correct: r.filter((x) => x.isCorrect).length,
        total: r.length,
      });
    }
    setPhase('complete');
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Select phase
  if (phase === 'select') return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>⚔️ Challenge Mode</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Test your knowledge under pressure. Complete revision first to unlock all challenges.
        </p>
      </div>

      <div className="card">
        <h3 className="font-bold mb-4" style={{ color: 'var(--color-text)' }}>Choose Challenge Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {([
            { id: 'mixed', label: '🎲 Mixed', desc: 'All question types' },
            { id: 'meaning', label: '💭 Meaning', desc: 'Define words' },
            { id: 'synonym', label: '🔗 Synonyms', desc: 'Find similar words' },
            { id: 'antonym', label: '↔️ Antonyms', desc: 'Find opposites' },
            { id: 'sentence', label: '✍️ Sentences', desc: 'Use words correctly' },
          ] as Array<{ id: ChallengeType; label: string; desc: string }>).map(({ id, label, desc }) => (
            <button key={id}
              className="p-4 rounded-xl text-left transition-all"
              style={{
                background: challengeType === id ? 'rgba(99,102,241,0.15)' : 'var(--color-surface-2)',
                border: challengeType === id ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--color-border)',
              }}
              onClick={() => setChallengeType(id)}>
              <div className="font-semibold text-sm" style={{ color: challengeType === id ? 'var(--color-primary-light)' : 'var(--color-text)' }}>
                {label}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-faint)' }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold mb-4" style={{ color: 'var(--color-text)' }}>Number of Questions</h3>
        <div className="flex gap-3">
          {[5, 10, 15, 20].map((n) => (
            <button key={n}
              className="flex-1 py-3 rounded-xl font-bold transition-all"
              style={{
                background: wordCount === n ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--color-surface-2)',
                color: wordCount === n ? 'white' : 'var(--color-text-muted)',
                border: wordCount === n ? 'none' : '1px solid var(--color-border)',
              }}
              onClick={() => setWordCount(n)}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-primary w-full btn-lg" onClick={startChallenge} disabled={loading}>
        {loading && <Loader2 size={18} className="animate-spin" />}
        {loading ? 'Preparing...' : 'Start Challenge'} <ArrowRight size={18} />
      </button>
    </div>
  );

  // Playing phase
  if (phase === 'playing') {
    const q = questions[currentIdx];
    const prompts: Record<string, string> = {
      meaning: `What does "${q.word.word}" mean?`,
      synonym: `Give a synonym for "${q.word.word}"`,
      antonym: `Give an antonym for "${q.word.word}"`,
      sentence: `Use "${q.word.word}" in a sentence`,
    };

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            {currentIdx + 1} / {questions.length}
          </span>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: timeLeft < 60 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${timeLeft < 60 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
            <Timer size={14} style={{ color: timeLeft < 60 ? '#ef4444' : '#f59e0b' }} />
            <span className="font-mono font-bold text-sm" style={{ color: timeLeft < 60 ? '#ef4444' : '#f59e0b' }}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(currentIdx / questions.length) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }} />
        </div>

        <div className="card text-center" style={{ padding: '40px 32px' }}>
          <h2 className="text-5xl font-bold gradient-text mb-2">{q.word.word}</h2>
          {q.word.pronunciation && (
            <p className="font-mono text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>{q.word.pronunciation}</p>
          )}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className={`badge diff-${q.word.difficulty}`}>{q.word.difficulty}</span>
            <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>{q.word.partOfSpeech}</span>
          </div>

          <div className="p-4 rounded-xl mb-4" style={{ background: 'var(--color-surface-2)' }}>
            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{prompts[q.questionType] || prompts.meaning}</p>
          </div>

          <input value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && userAnswer.trim() && submitAnswer()}
            placeholder="Type your answer..."
            autoFocus className="mb-4" />

          <button className="btn btn-primary w-full btn-lg" onClick={submitAnswer} disabled={!userAnswer.trim()}>
            {currentIdx + 1 >= questions.length ? 'Finish' : 'Next'} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Complete phase
  if (phase === 'complete' && finalScore) return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in text-center">
      <div className="card" style={{ padding: '48px 32px' }}>
        <div className="text-6xl mb-4">
          {finalScore.score >= 80 ? '🏆' : finalScore.score >= 60 ? '🎯' : '💪'}
        </div>
        <h2 className="text-3xl font-bold gradient-text mb-2">
          {finalScore.score >= 80 ? 'Excellent!' : finalScore.score >= 60 ? 'Good Job!' : 'Keep Practicing!'}
        </h2>
        <div className="text-6xl font-bold mt-4 mb-2" style={{ color: 'var(--color-text)' }}>
          {finalScore.score}%
        </div>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {finalScore.correct} / {finalScore.total} correct · {formatTime(timeTaken)}
        </p>

        <div className="grid grid-cols-3 gap-4 mt-6">
          {[
            { label: 'Score', value: `${finalScore.score}%`, icon: Trophy, color: '#f59e0b' },
            { label: 'Correct', value: finalScore.correct, icon: CheckCircle2, color: '#10b981' },
            { label: 'Incorrect', value: finalScore.total - finalScore.correct, icon: XCircle, color: '#ef4444' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="p-4 rounded-xl" style={{ background: 'var(--color-surface-2)' }}>
              <Icon size={20} className="mx-auto mb-2" style={{ color }} />
              <div className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{value}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-faint)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button className="btn btn-secondary flex-1" onClick={() => setPhase('select')}>
          <Zap size={16} /> Try Again
        </button>
        <button className="btn btn-primary flex-1" onClick={() => window.location.href = '/vocabulary'}>
          <Brain size={16} /> Review Words
        </button>
      </div>
    </div>
  );

  return null;
}
