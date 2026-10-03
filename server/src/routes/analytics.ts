import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

export const analyticsRouter = Router();
const prisma = new PrismaClient();

analyticsRouter.use(authenticate);

analyticsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const [totalLearned, totalMastered, totalAttempts, correctAttempts, totalSessions] =
      await Promise.all([
        prisma.userWord.count({ where: { userId, firstLearnedAt: { not: null } } }),
        prisma.userWord.count({ where: { userId, status: 'mastered' } }),
        prisma.reviewAttempt.count({ where: { userId } }),
        prisma.reviewAttempt.count({ where: { userId, isCorrect: true } }),
        prisma.learningSession.count({ where: { userId, isCompleted: true } }),
      ]);

    const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

    // Status distribution
    const statusCounts = await prisma.userWord.groupBy({
      by: ['status'],
      where: { userId, firstLearnedAt: { not: null } },
      _count: true,
    });

    // Category performance
    const categoryPerf = await prisma.reviewAttempt.findMany({
      where: { userId },
      include: { word: { select: { category: true } } },
    });

    const catMap: Record<string, { correct: number; total: number }> = {};
    for (const a of categoryPerf) {
      const cat = a.word.category;
      if (!catMap[cat]) catMap[cat] = { correct: 0, total: 0 };
      catMap[cat].total++;
      if (a.isCorrect) catMap[cat].correct++;
    }

    const categoryStats = Object.entries(catMap).map(([category, { correct, total }]) => ({
      category,
      accuracy: Math.round((correct / total) * 100),
      total,
    })).sort((a, b) => b.accuracy - a.accuracy);

    // Weekly learning (last 30 days)
    const days30: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days30.push(d.toISOString().split('T')[0]);
    }

    const sessions30 = await prisma.learningSession.findMany({
      where: { userId, date: { in: days30 } },
    });

    const dailyData = days30.map((date) => {
      const daySessions = sessions30.filter((s) => s.date === date);
      const wordsLearned = daySessions
        .filter((s) => s.sessionType === 'new_words')
        .reduce((sum, s) => sum + s.totalWords, 0);
      const revisionScore = daySessions
        .filter((s) => s.sessionType === 'revision')
        .reduce((avg, s) => avg + (s.score || 0), 0);
      return { date, wordsLearned, revisionScore: Math.round(revisionScore) };
    });

    // Streak
    const streaks = await prisma.userStreak.findMany({
      where: { userId, completed: true },
      orderBy: { date: 'desc' },
    });

    let currentStreak = 0;
    let longestStreak = 0;
    let temp = 0;
    let expected = new Date();
    expected.setHours(0, 0, 0, 0);

    for (const s of streaks) {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((expected.getTime() - d.getTime()) / 86400000);
      if (diff <= 1) {
        temp++;
        longestStreak = Math.max(longestStreak, temp);
        expected = new Date(d);
        expected.setDate(expected.getDate() - 1);
      } else {
        if (currentStreak === 0 && temp > 0) currentStreak = temp;
        temp = 1;
        expected = new Date(d);
        expected.setDate(expected.getDate() - 1);
      }
    }
    if (currentStreak === 0) currentStreak = temp;
    longestStreak = Math.max(longestStreak, temp);

    // Sentences created
    const sentencesCreated = await prisma.userSentence.count({ where: { userId } });
    const avgSentenceScore = await prisma.userSentence.aggregate({
      where: { userId },
      _avg: { aiScore: true },
    });

    res.json({
      overview: {
        totalLearned,
        totalMastered,
        accuracy,
        totalSessions,
        sentencesCreated,
        avgSentenceScore: Math.round(avgSentenceScore._avg.aiScore || 0),
        currentStreak,
        longestStreak,
      },
      statusDistribution: statusCounts.map((s) => ({ status: s.status, count: s._count })),
      categoryPerformance: categoryStats,
      dailyProgress: dailyData,
    });
  } catch (error) { next(error); }
});
