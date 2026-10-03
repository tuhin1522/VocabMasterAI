import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Volume2, ChevronRight, CheckCircle2, XCircle, Eye, Loader2,
  Lightbulb, HelpCircle, BookOpen, ArrowRight, Star, RefreshCw
} from 'lucide-react';
import { learningAPI } from '../api/client';
import { Word, TodayWordsResult, EvaluationResult } from '../types';

type Phase = 'meaning' | 'synonyms' | 'antonyms' | 'sentence' | 'feedback';

interface WordAnswer {
  meaning: string;
  synonyms: string;
  antonyms: string;
  sentence: string;
}

interface FeedbackData {
  meaningEval?: EvaluationResult;
  sentenceEval?: EvaluationResult;
  hintUsed: boolean;
}

export default function LearnPage() {
  const [result, setResult] = useState<TodayWordsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('meaning');
  const [answer, setAnswer] = useState<WordAnswer>({ meaning: '', synonyms: '', antonyms: '', sentence: '' });
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setLoading(true);
    learningAPI.getTodayWords()
      .then((r) => setResult(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const currentWord: Word | undefined = result?.words?.[currentIdx];

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = 0.8;
      speechSynthesis.speak(u);
    }
  };

  const handleIDontKnow = () => {
    setHintUsed(true);
    setPhase('feedback');
    setFeedback({ hintUsed: true });
  };

  const handlePhaseSubmit = async () => {
    if (phase === 'meaning') { setPhase('synonyms'); return; }
    if (phase === 'synonyms') { setPhase('antonyms'); return; }
    if (phase === 'antonyms') { setPhase('sentence'); return; }

    if (phase === 'sentence') {
      setEvaluating(true);
      try {
        const [meaningRes, sentenceRes] = await Promise.all([
          answer.meaning.trim()
            ? learningAPI.evaluateMeaning(currentWord!.id, answer.meaning).then((r) => r.data)
            : Promise.resolve(null),
          answer.sentence.trim()
            ? learningAPI.evaluateSentence(currentWord!.id, answer.sentence).then((r) => r.data)
            : Promise.resolve(null),
        ]);
        setFeedback({
          meaningEval: meaningRes,
          sentenceEval: sentenceRes,
          hintUsed: false,
        });
        setPhase('feedback');
      } finally {
        setEvaluating(false);
      }
    }
  };

  const handleWordComplete = async () => {
    if (!currentWord) return;
    setSubmitting(true);
    try {
      await learningAPI.submitWord(currentWord.id, hintUsed);
      const nextIdx = currentIdx + 1;
      if (result?.words && nextIdx >= result.words.length) {
        load(); // reload — session may be complete
        setCurrentIdx(0);
      } else {
        setCurrentIdx(nextIdx);
      }
      setPhase('meaning');
      setAnswer({ meaning: '', synonyms: '', antonyms: '', sentence: '' });
      setFeedback(null);
      setHintUsed(false);
      setShowMnemonic(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="spinner w-8 h-8" />
    </div>
  );

  // Locked state
  if (result?.locked) return (
    <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
      <div className="text-6xl">🔒</div>
      <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>New Words Locked</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>
        {result.reason || 'Complete today\'s revision to unlock new words.'}
      </p>
      <p className="text-sm" style={{ color: 'var(--color-text-faint)' }}>
        {result.pendingRevisions} revision{result.pendingRevisions !== 1 ? 's' : ''} pending
      </p>
      <button className="btn btn-primary" onClick={() => navigate('/revision')}>
        <RefreshCw size={16} /> Go to Revision
      </button>
    </div>
  );

  // Completed state
  if (result?.completed || !currentWord) return (
    <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
      <div className="text-6xl">🎉</div>
      <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>Daily Goal Complete!</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>{result?.message || 'Great job! Come back tomorrow for more.'}</p>
      <div className="flex gap-3">
        <button className="btn btn-secondary" onClick={() => navigate('/vocabulary')}>
          <BookOpen size={16} /> View Vocabulary
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/challenges')}>
          <Star size={16} /> Try Challenges
        </button>
      </div>
    </div>
  );

  const totalWords = result?.words?.length || 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            WORD {currentIdx + 1} / {totalWords}
          </span>
          <div className="flex gap-1">
            {result?.words?.map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full transition-all"
                style={{ background: i < currentIdx ? '#10b981' : i === currentIdx ? '#6366f1' : 'var(--color-border)' }} />
            ))}
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((currentIdx) / totalWords) * 100}%` }} />
        </div>
      </div>

      {/* Word card */}
      <div className="card text-center" style={{ padding: '40px 32px' }}>
        {/* Difficulty + POS badges */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className={`badge diff-${currentWord.difficulty}`}>{currentWord.difficulty}</span>
          <span className="badge" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
            {currentWord.partOfSpeech}
          </span>
          <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary-light)' }}>
            {currentWord.category}
          </span>
        </div>

        {/* The Word */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <h1 className="text-5xl font-bold gradient-text">{currentWord.word}</h1>
          <button onClick={() => speak(currentWord.word)} className="p-2 rounded-xl transition-all hover:bg-opacity-10"
            style={{ color: 'var(--color-primary-light)', background: 'rgba(99,102,241,0.1)' }}>
            <Volume2 size={20} />
          </button>
        </div>

        {currentWord.pronunciation && (
          <div className="text-lg mb-6 font-mono" style={{ color: 'var(--color-text-muted)' }}>
            {currentWord.pronunciation}
          </div>
        )}

        {/* Phase content */}
        {phase !== 'feedback' && (
          <div className="space-y-4 text-left">
            {phase === 'meaning' && (
              <div>
                <label className="block text-base font-semibold mb-3 text-center" style={{ color: 'var(--color-text)' }}>
                  💭 What does this word mean?
                </label>
                <textarea value={answer.meaning}
                  onChange={(e) => setAnswer((p) => ({ ...p, meaning: e.target.value }))}
                  placeholder="Type your definition here..."
                  rows={3} style={{ resize: 'none' }} />
              </div>
            )}
            {phase === 'synonyms' && (
              <div>
                <label className="block text-base font-semibold mb-3 text-center" style={{ color: 'var(--color-text)' }}>
                  🔗 Write one or more synonyms
                </label>
                <input value={answer.synonyms}
                  onChange={(e) => setAnswer((p) => ({ ...p, synonyms: e.target.value }))}
                  placeholder="Separate with commas: word1, word2..." />
              </div>
            )}
            {phase === 'antonyms' && (
              <div>
                <label className="block text-base font-semibold mb-3 text-center" style={{ color: 'var(--color-text)' }}>
                  ↔️ Write one or more antonyms
                </label>
                <input value={answer.antonyms}
                  onChange={(e) => setAnswer((p) => ({ ...p, antonyms: e.target.value }))}
                  placeholder="Separate with commas: word1, word2..." />
              </div>
            )}
            {phase === 'sentence' && (
              <div>
                <label className="block text-base font-semibold mb-3 text-center" style={{ color: 'var(--color-text)' }}>
                  ✍️ Create a sentence using "{currentWord.word}"
                </label>
                <textarea value={answer.sentence}
                  onChange={(e) => setAnswer((p) => ({ ...p, sentence: e.target.value }))}
                  placeholder={`Use "${currentWord.word}" in a meaningful sentence...`}
                  rows={3} style={{ resize: 'none' }} />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button className="btn btn-secondary flex-1" onClick={handleIDontKnow}>
                <HelpCircle size={16} /> I don't know
              </button>
              <button className="btn btn-primary flex-1"
                onClick={handlePhaseSubmit}
                disabled={evaluating}>
                {evaluating && <Loader2 size={16} className="animate-spin" />}
                {evaluating ? 'Evaluating...' : phase === 'sentence' ? 'Submit & Check' : 'Continue'}
                {!evaluating && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Feedback phase */}
        {phase === 'feedback' && (
          <FeedbackView
            word={currentWord}
            answers={answer}
            feedback={feedback}
            hintUsed={hintUsed}
            showMnemonic={showMnemonic}
            onToggleMnemonic={() => setShowMnemonic(!showMnemonic)}
            onNext={handleWordComplete}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}

function FeedbackView({ word, answers, feedback, hintUsed, showMnemonic, onToggleMnemonic, onNext, submitting }: {
  word: Word;
  answers: WordAnswer;
  feedback: FeedbackData | null;
  hintUsed: boolean;
  showMnemonic: boolean;
  onToggleMnemonic: () => void;
  onNext: () => void;
  submitting: boolean;
}) {
  const meaningEval = feedback?.meaningEval;
  const sentenceEval = feedback?.sentenceEval;

  return (
    <div className="space-y-4 text-left animate-fade-in">
      {/* Meaning comparison */}
      <div className={meaningEval?.isCorrect ? 'feedback-correct' : meaningEval ? 'feedback-partial' : 'feedback-incorrect'}>
        <div className="flex items-center gap-2 mb-2">
          {hintUsed ? <Eye size={16} style={{ color: 'var(--color-text-muted)' }} /> :
            meaningEval?.isCorrect ? <CheckCircle2 size={16} style={{ color: '#10b981' }} /> :
            <XCircle size={16} style={{ color: '#ef4444' }} />}
          <span className="font-bold text-sm">
            {hintUsed ? 'Answer Revealed' : meaningEval?.isCorrect ? '✓ Great definition!' : 'Correct Meaning'}
          </span>
          {!hintUsed && meaningEval && (
            <span className="ml-auto text-sm font-bold" style={{ color: '#f59e0b' }}>
              {meaningEval.score}/100
            </span>
          )}
        </div>
        {!hintUsed && answers.meaning && (
          <p className="text-sm mb-2 italic" style={{ color: 'var(--color-text-muted)' }}>
            Your answer: "{answers.meaning}"
          </p>
        )}
        <p className="font-medium" style={{ color: 'var(--color-text)' }}>{word.meaning}</p>
        {word.bengaliMeaning && (
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            বাংলা: {word.bengaliMeaning}
          </p>
        )}
        {meaningEval?.feedback && (
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
            {meaningEval.feedback}
          </p>
        )}
      </div>

      {/* Synonyms & Antonyms */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div className="text-xs font-bold mb-2" style={{ color: 'var(--color-primary-light)' }}>SYNONYMS</div>
          <div className="flex flex-wrap gap-1">
            {word.synonyms.slice(0, 5).map((s) => (
              <span key={s.id} className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--color-primary-light)', fontSize: '11px' }}>
                {s.text}
              </span>
            ))}
          </div>
        </div>
        <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="text-xs font-bold mb-2" style={{ color: '#ef4444' }}>ANTONYMS</div>
          <div className="flex flex-wrap gap-1">
            {word.antonyms.slice(0, 5).map((a) => (
              <span key={a.id} className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: '11px' }}>
                {a.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sentence feedback */}
      {sentenceEval && (
        <div className={sentenceEval.isCorrect ? 'feedback-correct' : 'feedback-partial'}>
          <div className="flex items-center gap-2 mb-2">
            {sentenceEval.isCorrect ? <CheckCircle2 size={16} style={{ color: '#10b981' }} /> : <XCircle size={16} style={{ color: '#f59e0b' }} />}
            <span className="font-bold text-sm">Sentence Feedback</span>
            <span className="ml-auto text-sm font-bold" style={{ color: '#f59e0b' }}>{sentenceEval.score}/100</span>
          </div>
          <p className="text-sm mb-1 italic" style={{ color: 'var(--color-text-muted)' }}>
            Your: "{answers.sentence}"
          </p>
          {sentenceEval.correctedSentence && sentenceEval.correctedSentence !== answers.sentence && (
            <p className="text-sm font-medium" style={{ color: '#10b981' }}>
              ✓ Better: "{sentenceEval.correctedSentence}"
            </p>
          )}
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{sentenceEval.feedback}</p>
        </div>
      )}

      {/* Examples */}
      {word.examples.length > 0 && (
        <div className="p-3 rounded-xl" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <div className="text-xs font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>EXAMPLE SENTENCES</div>
          <div className="space-y-1">
            {word.examples.slice(0, 2).map((ex) => (
              <p key={ex.id} className="text-sm" style={{ color: 'var(--color-text)' }}>
                • <em>"{ex.sentence}"</em>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Mnemonic */}
      {word.mnemonic && (
        <div>
          <button onClick={onToggleMnemonic} className="flex items-center gap-2 text-sm font-semibold w-full p-3 rounded-xl transition-all"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
            <Lightbulb size={16} />
            {showMnemonic ? 'Hide Mnemonic' : '💡 Show AI Mnemonic'}
            <ChevronRight size={14} className={`ml-auto transition-transform ${showMnemonic ? 'rotate-90' : ''}`} />
          </button>
          {showMnemonic && (
            <div className="mt-2 p-3 rounded-xl animate-fade-in"
              style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>{word.mnemonic}</p>
              {word.memoryAssociation && (
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>{word.memoryAssociation}</p>
              )}
            </div>
          )}
        </div>
      )}

      <button className="btn btn-primary w-full btn-lg" onClick={onNext} disabled={submitting}>
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? 'Saving...' : 'Next Word'}
        {!submitting && <ArrowRight size={16} />}
      </button>
    </div>
  );
}
