import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimiter';
import { getTodayWords, submitLearningWord } from '../services/learningService';
import { evaluateSentence, evaluateMeaning } from '../ai/geminiService';
import { PrismaClient } from '@prisma/client';

export const learningRouter = Router();
const prisma = new PrismaClient();

learningRouter.use(authenticate);

// Get today's new words
learningRouter.get('/today', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await getTodayWords(req.userId!);
    res.json(result);
  } catch (error) { next(error); }
});

// Submit a learned word
learningRouter.post('/submit', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { wordId, sessionId, hintUsed } = z.object({
      wordId: z.string(),
      sessionId: z.string().optional().default(''),
      hintUsed: z.boolean().default(false),
    }).parse(req.body);

    const result = await submitLearningWord(req.userId!, wordId, sessionId, hintUsed);
    res.json(result);
  } catch (error) { next(error); }
});

// Evaluate sentence with AI
learningRouter.post('/sentence/evaluate', aiLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { wordId, sentence } = z.object({
      wordId: z.string(),
      sentence: z.string().min(3),
    }).parse(req.body);

    const word = await prisma.word.findUnique({ where: { id: wordId } });
    if (!word) return res.status(404).json({ error: 'Word not found' });

    const evaluation = await evaluateSentence(word.word, sentence);

    // Save the sentence
    await prisma.userSentence.create({
      data: {
        userId: req.userId!,
        wordId,
        sentence,
        aiScore: evaluation.score,
        aiIsCorrect: evaluation.isCorrect,
        aiFeedback: evaluation.feedback,
        correctedSentence: evaluation.correctedSentence,
      },
    });

    return res.json(evaluation);
  } catch (error) { return next(error); }
});

// Evaluate meaning with AI
learningRouter.post('/meaning/evaluate', aiLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { wordId, userMeaning } = z.object({
      wordId: z.string(),
      userMeaning: z.string().min(2),
    }).parse(req.body);

    const word = await prisma.word.findUnique({ where: { id: wordId } });
    if (!word) return res.status(404).json({ error: 'Word not found' });

    const evaluation = await evaluateMeaning(word.word, word.meaning, userMeaning);
    return res.json(evaluation);
  } catch (error) { return next(error); }
});
