export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  dailyWordTarget: number;
  preferredLanguage: 'english' | 'bengali' | 'both';
  role: 'user' | 'admin';
  createdAt: string;
}

export interface Word {
  id: string;
  word: string;
  meaning: string;
  bengaliMeaning?: string;
  partOfSpeech: string;
  pronunciation?: string;
  difficulty: string;
  category: string;
  mnemonic?: string;
  memoryAssociation?: string;
  usageExplanation?: string;
  commonMistakes?: string;
  synonyms: { id: string; text: string }[];
  antonyms: { id: string; text: string }[];
  examples: { id: string; sentence: string; context?: string }[];
  userStatus?: string;
  masteryLevel?: number;
  isFavorite?: boolean;
  createdAt: string;
}

export interface UserWord {
  id: string;
  userId: string;
  wordId: string;
  status: 'new' | 'learning' | 'review' | 'weak' | 'developing' | 'strong' | 'mastered';
  masteryLevel: number;
  confidenceScore: number;
  firstLearnedAt?: string;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  reviewCount: number;
  correctCount: number;
  incorrectCount: number;
  hintCount: number;
  word: Word;
}

export interface DashboardData {
  user: { name: string; dailyWordTarget: number };
  today: {
    revisionCompleted: boolean;
    revisionProgress: { completed: number; total: number };
    newWordsLocked: boolean;
    newWordsProgress: { completed: number; total: number };
    newWordsCompleted: boolean;
    pendingRevisions: number;
  };
  stats: {
    totalLearned: number;
    totalMastered: number;
    accuracy: number;
    currentStreak: number;
    longestStreak: number;
  };
  weeklyProgress: Array<{ date: string; wordsLearned: number; revisionCompleted: boolean }>;
}

export interface RevisionQuestion {
  userWord: { id: string; status: string; masteryLevel: number; reviewCount: number };
  word: Word;
  questionType: string;
}

export interface EvaluationResult {
  isCorrect: boolean;
  score: number;
  feedback: string;
  correctedSentence?: string;
  explanation?: string;
}

export interface AnalyticsData {
  overview: {
    totalLearned: number;
    totalMastered: number;
    accuracy: number;
    totalSessions: number;
    sentencesCreated: number;
    avgSentenceScore: number;
    currentStreak: number;
    longestStreak: number;
  };
  statusDistribution: Array<{ status: string; count: number }>;
  categoryPerformance: Array<{ category: string; accuracy: number; total: number }>;
  dailyProgress: Array<{ date: string; wordsLearned: number; revisionScore: number }>;
}

export interface TodayWordsResult {
  locked?: boolean;
  completed?: boolean;
  reason?: string;
  message?: string;
  words?: Word[];
  pendingRevisions?: number;
  targetCount?: number;
  sessionDate?: string;
}
