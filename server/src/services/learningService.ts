import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { getPendingRevisions } from './spacedRepetitionService';

const prisma = new PrismaClient();

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getDashboardData(userId: string) {
  const today = getTodayString();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  // Today's sessions
  const todayRevisionSession = await prisma.learningSession.findFirst({
    where: { userId, sessionType: 'revision', date: today },
  });

  const todayLearningSession = await prisma.learningSession.findFirst({
    where: { userId, sessionType: 'new_words', date: today },
  });

  // Pending revisions
  const pendingRevisions = await getPendingRevisions(userId);
  const newWordsLocked = pendingRevisions > 0 && !todayRevisionSession?.isCompleted;

  // All time stats
  const [totalLearned, totalMastered, totalReviewed] = await Promise.all([
    prisma.userWord.count({ where: { userId, firstLearnedAt: { not: null } } }),
    prisma.userWord.count({ where: { userId, status: 'mastered' } }),
    prisma.reviewAttempt.count({ where: { userId } }),
  ]);

  // Accuracy
  const correctAttempts = await prisma.reviewAttempt.count({
    where: { userId, isCorrect: true },
  });
  const accuracy = totalReviewed > 0 ? Math.round((correctAttempts / totalReviewed) * 100) : 0;

  // Current streak
  const streak = await calculateStreak(userId);

  // Weekly progress (last 7 days)
  const weeklyProgress = await getWeeklyProgress(userId);

  return {
    user: {
      name: user.name,
      dailyWordTarget: user.dailyWordTarget,
    },
    today: {
      revisionCompleted: todayRevisionSession?.isCompleted || false,
      revisionProgress: {
        completed: todayRevisionSession?.correctCount || 0,
        total: todayRevisionSession?.totalWords || pendingRevisions,
      },
      newWordsLocked,
      newWordsProgress: {
        completed: todayLearningSession?.totalWords || 0,
        total: user.dailyWordTarget,
      },
      newWordsCompleted: (todayLearningSession?.totalWords || 0) >= user.dailyWordTarget,
      pendingRevisions,
    },
    stats: {
      totalLearned,
      totalMastered,
      accuracy,
      currentStreak: streak.current,
      longestStreak: streak.longest,
    },
    weeklyProgress,
  };
}

async function calculateStreak(userId: string): Promise<{ current: number; longest: number }> {
  const streaks = await prisma.userStreak.findMany({
    where: { userId, completed: true },
    orderBy: { date: 'desc' },
  });

  if (streaks.length === 0) return { current: 0, longest: 0 };

  let current = 0;
  let longest = 0;
  let tempStreak = 0;
  let expectedDate = new Date();
  expectedDate.setHours(0, 0, 0, 0);

  for (const s of streaks) {
    const sDate = new Date(s.date);
    sDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((expectedDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      tempStreak++;
      if (diffDays === 0 || diffDays === 1) {
        if (current === 0) current = tempStreak;
      }
      longest = Math.max(longest, tempStreak);
      expectedDate = sDate;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      if (current === 0) current = tempStreak;
      tempStreak = 1;
      expectedDate = sDate;
      expectedDate.setDate(expectedDate.getDate() - 1);
    }
  }

  if (current === 0) current = tempStreak;
  longest = Math.max(longest, tempStreak);

  return { current, longest };
}

async function getWeeklyProgress(userId: string) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  const sessions = await prisma.learningSession.findMany({
    where: { userId, date: { in: days } },
  });

  return days.map((date) => {
    const daySessions = sessions.filter((s) => s.date === date);
    const wordsLearned = daySessions
      .filter((s) => s.sessionType === 'new_words')
      .reduce((sum, s) => sum + s.totalWords, 0);
    const revisionCompleted = daySessions.some(
      (s) => s.sessionType === 'revision' && s.isCompleted
    );
    return { date, wordsLearned, revisionCompleted };
  });
}

export async function getTodayWords(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const today = getTodayString();

  // Check if revision is required
  const pendingRevisions = await getPendingRevisions(userId);
  const todayRevisionSession = await prisma.learningSession.findFirst({
    where: { userId, sessionType: 'revision', date: today },
  });

  if (pendingRevisions > 0 && !todayRevisionSession?.isCompleted) {
    return {
      locked: true,
      reason: 'Complete today\'s revision to unlock new words.',
      pendingRevisions,
    };
  }

  // Get words already learned today
  const todaySession = await prisma.learningSession.findFirst({
    where: { userId, sessionType: 'new_words', date: today },
  });

  if (todaySession?.isCompleted) {
    return {
      locked: false,
      completed: true,
      totalWords: todaySession.totalWords,
      message: 'You have completed today\'s learning session! Great work! 🎉',
    };
  }

  // Get learned word IDs
  const learnedWordIds = await prisma.userWord.findMany({
    where: { userId, firstLearnedAt: { not: null } },
    select: { wordId: true },
  });
  const learnedIds = learnedWordIds.map((w) => w.wordId);

  // Fetch new words
  const words = await prisma.word.findMany({
    where: {
      id: { notIn: learnedIds },
      isApproved: true,
    },
    include: {
      synonyms: true,
      antonyms: true,
      examples: true,
    },
    take: user.dailyWordTarget,
    orderBy: { createdAt: 'asc' },
  });

  if (words.length === 0) {
    return {
      locked: false,
      completed: false,
      words: [],
      message: 'No new words available. Try adding custom vocabulary!',
    };
  }

  return {
    locked: false,
    completed: false,
    words,
    sessionDate: today,
    targetCount: user.dailyWordTarget,
  };
}

export async function submitLearningWord(
  userId: string,
  wordId: string,
  sessionId: string,
  hintUsed: boolean
) {
  const today = getTodayString();

  // Ensure session exists
  let session = await prisma.learningSession.findFirst({
    where: { userId, sessionType: 'new_words', date: today },
  });

  if (!session) {
    session = await prisma.learningSession.create({
      data: {
        userId,
        sessionType: 'new_words',
        date: today,
        totalWords: 0,
      },
    });
  }

  // Mark word as learned
  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + 1); // First review next day

  await prisma.userWord.upsert({
    where: { userId_wordId: { userId, wordId } },
    update: {
      firstLearnedAt: now,
      hintCount: hintUsed ? 1 : 0,
      status: 'learning',
      nextReviewAt: nextReview,
    },
    create: {
      userId,
      wordId,
      firstLearnedAt: now,
      hintCount: hintUsed ? 1 : 0,
      status: 'learning',
      nextReviewAt: nextReview,
    },
  });

  // Update session
  const newTotal = session.totalWords + 1;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isCompleted = newTotal >= (user?.dailyWordTarget || 10);

  await prisma.learningSession.update({
    where: { id: session.id },
    data: {
      totalWords: newTotal,
      isCompleted,
      completedAt: isCompleted ? new Date() : undefined,
    },
  });

  // Update streak
  if (isCompleted) {
    await prisma.userStreak.upsert({
      where: { userId_date: { userId, date: today } },
      update: { completed: true, wordsLearned: newTotal },
      create: { userId, date: today, completed: true, wordsLearned: newTotal },
    });
  }

  return { success: true, sessionCompleted: isCompleted, wordsLearned: newTotal };
}
