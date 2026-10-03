import { Router, Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimiter';
import { generateVocabularyData } from '../ai/geminiService';
import { AppError } from '../middleware/errorHandler';

export const wordsRouter = Router();
const prisma = new PrismaClient();

wordsRouter.use(authenticate);

const getQueryString = (val: unknown): string | undefined =>
  typeof val === 'string' ? val : undefined;

// Get all words (with user's progress)
wordsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId as string;
    const search = getQueryString(req.query.search);
    const category = getQueryString(req.query.category);
    const difficulty = getQueryString(req.query.difficulty);
    const page = getQueryString(req.query.page) || '1';
    const limit = getQueryString(req.query.limit) || '20';
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: Prisma.WordWhereInput = {
      isApproved: true,
      ...(search ? { word: { contains: search } } : {}),
      ...(category ? { category } : {}),
      ...(difficulty ? { difficulty } : {}),
    };

    const [words, total] = await Promise.all([
      prisma.word.findMany({
        where,
        include: {
          synonyms: true,
          antonyms: true,
          examples: true,
          userWords: {
            where: { userId },
            select: { status: true, masteryLevel: true, nextReviewAt: true },
          },
          userFavorites: {
            where: { userId },
            select: { id: true },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: { word: 'asc' },
      }),
      prisma.word.count({ where }),
    ]);

    const wordsWithStatus = words.map((w) => ({
      ...w,
      userStatus: w.userWords[0]?.status || null,
      masteryLevel: w.userWords[0]?.masteryLevel || 0,
      isFavorite: w.userFavorites.length > 0,
      userWords: undefined,
      userFavorites: undefined,
    }));

    res.json({ words: wordsWithStatus, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) { next(error); }
});

// Get specific word
wordsRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId as string;
    const word = await prisma.word.findUnique({
      where: { id: req.params.id },
      include: {
        synonyms: true, antonyms: true, examples: true,
        userWords: { where: { userId } },
        userSentences: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        userFavorites: { where: { userId }, select: { id: true } },
      },
    });
    if (!word) throw new AppError('Word not found', 404);
    res.json({ ...word, isFavorite: word.userFavorites.length > 0 });
  } catch (error) { next(error); }
});

// Search by word string
wordsRouter.get('/search/:word', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const word = await prisma.word.findFirst({
      where: { word: { equals: req.params.word } },
      include: { synonyms: true, antonyms: true, examples: true },
    });
    if (!word) return res.json({ found: false, word: req.params.word });
    return res.json({ found: true, word });
  } catch (error) { return next(error); }
});

const createWordSchema = z.object({
  word: z.string().min(1).max(100),
  meaning: z.string().min(5),
  bengaliMeaning: z.string().optional(),
  partOfSpeech: z.string().optional(),
  pronunciation: z.string().optional(),
  difficulty: z.string().optional(),
  category: z.string().optional(),
  mnemonic: z.string().optional(),
  memoryAssociation: z.string().optional(),
  usageExplanation: z.string().optional(),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
  examples: z.array(z.object({ sentence: z.string(), context: z.string().optional() })).optional(),
});

// Create custom word
wordsRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createWordSchema.parse(req.body);
    const { synonyms = [], antonyms = [], examples = [], ...wordData } = data;

    const existing = await prisma.word.findFirst({
      where: { word: { equals: wordData.word } },
    });
    if (existing) throw new AppError('Word already exists', 409);

    const word = await prisma.word.create({
      data: {
        ...wordData,
        isAiGenerated: false,
        isApproved: true,
        synonyms: { create: synonyms.map((s) => ({ text: s })) },
        antonyms: { create: antonyms.map((a) => ({ text: a })) },
        examples: { create: examples.map((e) => ({ sentence: e.sentence, context: e.context })) },
      },
      include: { synonyms: true, antonyms: true, examples: true },
    });

    res.status(201).json(word);
  } catch (error) { next(error); }
});

// Update word
wordsRouter.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createWordSchema.parse(req.body);
    const { synonyms = [], antonyms = [], examples = [], ...wordData } = data;

    await prisma.$transaction([
      prisma.synonym.deleteMany({ where: { wordId: req.params.id } }),
      prisma.antonym.deleteMany({ where: { wordId: req.params.id } }),
      prisma.example.deleteMany({ where: { wordId: req.params.id } }),
    ]);

    const updated = await prisma.word.update({
      where: { id: req.params.id },
      data: {
        ...wordData,
        synonyms: { create: synonyms.map((s) => ({ text: s })) },
        antonyms: { create: antonyms.map((a) => ({ text: a })) },
        examples: { create: examples.map((e) => ({ sentence: e.sentence, context: e.context })) },
      },
      include: { synonyms: true, antonyms: true, examples: true },
    });

    res.json(updated);
  } catch (error) { next(error); }
});

// Generate word with AI
wordsRouter.post('/generate', aiLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { word } = z.object({ word: z.string().min(1) }).parse(req.body);

    const existing = await prisma.word.findFirst({
      where: { word: { equals: word } },
      include: { synonyms: true, antonyms: true, examples: true },
    });
    if (existing) return res.json({ generated: false, word: existing });

    const generated = await generateVocabularyData(word);
    return res.json({ generated: true, data: generated });
  } catch (error) { return next(error); }
});

// Save AI-generated word
wordsRouter.post('/generate/save', aiLimiter, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createWordSchema.parse(req.body);
    const { synonyms = [], antonyms = [], examples = [], ...wordData } = data;

    const word = await prisma.word.create({
      data: {
        ...wordData,
        isAiGenerated: true,
        isApproved: true,
        synonyms: { create: synonyms.map((s) => ({ text: s })) },
        antonyms: { create: antonyms.map((a) => ({ text: a })) },
        examples: { create: examples.map((e) => ({ sentence: e.sentence, context: e.context })) },
      },
      include: { synonyms: true, antonyms: true, examples: true },
    });

    res.status(201).json(word);
  } catch (error) { next(error); }
});

// Get user's vocabulary notebook
wordsRouter.get('/notebook/mine', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId as string;
    const status = getQueryString(req.query.status);
    const page = getQueryString(req.query.page) || '1';
    const limit = getQueryString(req.query.limit) || '20';
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: Prisma.UserWordWhereInput = {
      userId,
      ...(status ? { status } : { firstLearnedAt: { not: null } }),
    };

    const [userWords, total] = await Promise.all([
      prisma.userWord.findMany({
        where,
        include: {
          word: { include: { synonyms: true, antonyms: true, examples: true } },
        },
        skip,
        take: parseInt(limit),
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.userWord.count({ where }),
    ]);

    res.json({ words: userWords, total, page: parseInt(page) });
  } catch (error) { next(error); }
});

// Get weak words
wordsRouter.get('/weak/list', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId as string;
    const weakWords = await prisma.userWord.findMany({
      where: {
        userId,
        firstLearnedAt: { not: null },
        status: { in: ['weak', 'learning'] },
      },
      include: {
        word: { include: { synonyms: true, antonyms: true, examples: true } },
      },
      orderBy: { masteryLevel: 'asc' },
      take: 30,
    });
    res.json(weakWords);
  } catch (error) { next(error); }
});
