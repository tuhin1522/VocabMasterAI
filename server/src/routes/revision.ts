import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  getRevisionWords,
  generateQuestionType,
  updateUserWordAfterReview,
  getPendingRevisions,
} from '../services/spacedRepetitionService';

export const revisionRouter = Router();
const prisma = new PrismaClient();

revisionRouter.use(authenticate);

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// Get today's revision words
revisionRouter.get('/today', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const pendingCount = await getPendingRevisions(req.userId!);
    if (pendingCount === 0) {
      return res.json({
        hasRevision: false,
        message: 'No revisions pending! Great work! 🎉',
      });
    }

    const words = await getRevisionWords(req.userId!);

    // Assign question types
    const wordsWithQuestions = words.map((uw) => ({
      userWord: {
        id: uw.id,
        status: uw.status,
        masteryLevel: uw.masteryLevel,
        reviewCount: uw.reviewCount,
      },
      word: uw.word,
      questionType: generateQuestionType(uw.reviewCount),
    }));

    return res.json({
      hasRevision: true,
      pendingCount,
      words: wordsWithQuestions,
    });
  } catch (error) { return next(error); }
});

// Submit revision answer
revisionRouter.post('/submit', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { wordId, questionType, userAnswer, isCorrect, score, hintUsed } = z.object({
      wordId: z.string(),
      questionType: z.string(),
      userAnswer: z.string().optional().default(''),
      isCorrect: z.boolean(),
      score: z.number().min(0).max(100).optional().default(0),
      hintUsed: z.boolean().default(false),
    }).parse(req.body);

    const today = getTodayString();

    // Get or create today's revision session
    let session = await prisma.learningSession.findFirst({
      where: { userId: req.userId, sessionType: 'revision', date: today },
    });

    if (!session) {
      session = await prisma.learningSession.create({
        data: { userId: req.userId!, sessionType: 'revision', date: today },
      });
    }

    // Record the attempt
    await prisma.reviewAttempt.create({
      data: {
        userId: req.userId!,
        wordId,
        sessionId: session.id,
        questionType,
        userAnswer,
        isCorrect,
        score,
      },
    });

    // Update spaced repetition
    await updateUserWordAfterReview(req.userId!, wordId, isCorrect, hintUsed);

    // Update session
    const correct = session.correctCount + (isCorrect ? 1 : 0);
    const total = session.totalWords + 1;
    const pendingAfter = await getPendingRevisions(req.userId!);
    const completed = pendingAfter === 0;

    await prisma.learningSession.update({
      where: { id: session.id },
      data: {
        totalWords: total,
        correctCount: correct,
        isCompleted: completed,
        completedAt: completed ? new Date() : undefined,
        score: total > 0 ? (correct / total) * 100 : 0,
      },
    });

    res.json({
      success: true,
      revisionCompleted: completed,
      sessionScore: total > 0 ? Math.round((correct / total) * 100) : 0,
    });
  } catch (error) { next(error); }
});

// Get revision status
revisionRouter.get('/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = getTodayString();
    const pendingCount = await getPendingRevisions(req.userId!);
    const session = await prisma.learningSession.findFirst({
      where: { userId: req.userId, sessionType: 'revision', date: today },
    });

    res.json({
      pendingCount,
      todaySessionCompleted: session?.isCompleted || false,
      todayScore: session?.score || 0,
      todayCorrect: session?.correctCount || 0,
      todayTotal: session?.totalWords || 0,
    });
  } catch (error) { next(error); }
});
