import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';

export const challengeRouter = Router();
const prisma = new PrismaClient();

challengeRouter.use(authenticate);

// Get challenge words
challengeRouter.post('/start', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, count = 10 } = z.object({
      type: z.enum(['meaning', 'synonym', 'antonym', 'sentence', 'mixed']),
      count: z.number().min(5).max(30).optional(),
    }).parse(req.body);

    // Get random words the user has learned
    const learnedWords = await prisma.userWord.findMany({
      where: { userId: req.userId, firstLearnedAt: { not: null } },
      include: {
        word: { include: { synonyms: true, antonyms: true, examples: true } },
      },
      take: count * 2,
      orderBy: [{ masteryLevel: 'asc' }],
    });

    if (learnedWords.length === 0) {
      return res.json({
        error: 'You need to learn some words first before taking a challenge!',
      });
    }

    // Shuffle and take 'count'
    const shuffled = learnedWords.sort(() => Math.random() - 0.5).slice(0, count);

    const questionType = type === 'mixed'
      ? null // will be assigned per word
      : type;

    const questions = shuffled.map((uw) => ({
      word: uw.word,
      questionType: questionType || ['meaning', 'synonym', 'antonym'][Math.floor(Math.random() * 3)],
    }));

    return res.json({ questions, totalWords: questions.length });
  } catch (error) { return next(error); }
});

// Submit challenge results
challengeRouter.post('/complete', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { results, timeTaken } = z.object({
      results: z.array(z.object({
        wordId: z.string(),
        questionType: z.string(),
        userAnswer: z.string(),
        isCorrect: z.boolean(),
        score: z.number(),
      })),
      timeTaken: z.number(),
    }).parse(req.body);

    const session = await prisma.learningSession.create({
      data: {
        userId: req.userId!,
        sessionType: 'challenge',
        date: new Date().toISOString().split('T')[0],
        totalWords: results.length,
        correctCount: results.filter((r) => r.isCorrect).length,
        score: results.reduce((sum, r) => sum + r.score, 0) / results.length,
        isCompleted: true,
        completedAt: new Date(),
      },
    });

    // Record attempts
    await prisma.reviewAttempt.createMany({
      data: results.map((r) => ({
        userId: req.userId!,
        wordId: r.wordId,
        sessionId: session.id,
        questionType: r.questionType,
        userAnswer: r.userAnswer,
        isCorrect: r.isCorrect,
        score: r.score,
      })),
    });

    const finalScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);

    res.json({
      score: finalScore,
      correct: results.filter((r) => r.isCorrect).length,
      total: results.length,
      timeTaken,
    });
  } catch (error) { next(error); }
});
