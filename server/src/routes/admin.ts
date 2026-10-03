import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { generateVocabularyData } from '../ai/geminiService';

export const adminRouter = Router();
const prisma = new PrismaClient();

adminRouter.use(authenticate, requireAdmin);

// Get all users
adminRouter.get('/users', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, username: true, name: true, email: true,
        dailyWordTarget: true, role: true, createdAt: true,
        _count: { select: { userWords: true, reviewAttempts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) { next(error); }
});

// Get all words (admin)
adminRouter.get('/words', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const words = await prisma.word.findMany({
      include: {
        synonyms: true, antonyms: true, examples: true,
        _count: { select: { userWords: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(words);
  } catch (error) { next(error); }
});

// Update word
adminRouter.put('/words/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    const word = await prisma.word.update({
      where: { id: req.params.id },
      data: {
        meaning: data.meaning,
        bengaliMeaning: data.bengaliMeaning,
        partOfSpeech: data.partOfSpeech,
        pronunciation: data.pronunciation,
        difficulty: data.difficulty,
        category: data.category,
        mnemonic: data.mnemonic,
        memoryAssociation: data.memoryAssociation,
        usageExplanation: data.usageExplanation,
        isApproved: data.isApproved,
      },
    });
    res.json(word);
  } catch (error) { next(error); }
});

// Delete word
adminRouter.delete('/words/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.word.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) { next(error); }
});

// Regenerate AI content for a word
adminRouter.post('/words/:id/regenerate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const word = await prisma.word.findUnique({ where: { id: req.params.id } });
    if (!word) return res.status(404).json({ error: 'Word not found' });

    const generated = await generateVocabularyData(word.word);

    await prisma.word.update({
      where: { id: req.params.id },
      data: {
        meaning: generated.meaning,
        bengaliMeaning: generated.bengaliMeaning,
        mnemonic: generated.mnemonic,
        memoryAssociation: generated.memoryAssociation,
        usageExplanation: generated.usageExplanation,
        isAiGenerated: true,
      },
    });

    return res.json({ success: true, generated });
  } catch (error) { return next(error); }
});

// Bulk import words via CSV data
adminRouter.post('/words/import', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { words } = z.object({
      words: z.array(z.object({
        word: z.string(),
        meaning: z.string(),
        bengaliMeaning: z.string().optional(),
        difficulty: z.string().optional(),
        category: z.string().optional(),
        synonyms: z.string().optional(),
        antonyms: z.string().optional(),
      })),
    }).parse(req.body);

    let created = 0;
    let skipped = 0;

    for (const w of words) {
      const exists = await prisma.word.findFirst({
        where: { word: { equals: w.word } },
      });
      if (exists) { skipped++; continue; }

      await prisma.word.create({
        data: {
          word: w.word,
          meaning: w.meaning,
          bengaliMeaning: w.bengaliMeaning,
          difficulty: w.difficulty || 'B1',
          category: w.category || 'general',
          synonyms: {
            create: (w.synonyms || '').split(',').filter(Boolean).map((s) => ({ text: s.trim() })),
          },
          antonyms: {
            create: (w.antonyms || '').split(',').filter(Boolean).map((a) => ({ text: a.trim() })),
          },
        },
      });
      created++;
    }

    res.json({ created, skipped });
  } catch (error) { next(error); }
});

// Stats overview
adminRouter.get('/stats', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [totalUsers, totalWords, totalAttempts, totalSessions] = await Promise.all([
      prisma.user.count(),
      prisma.word.count(),
      prisma.reviewAttempt.count(),
      prisma.learningSession.count({ where: { isCompleted: true } }),
    ]);

    res.json({ totalUsers, totalWords, totalAttempts, totalSessions });
  } catch (error) { next(error); }
});
