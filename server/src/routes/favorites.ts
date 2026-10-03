import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';

export const favoritesRouter = Router();
const prisma = new PrismaClient();

favoritesRouter.use(authenticate);

favoritesRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId as string;
    const favorites = await prisma.userFavorite.findMany({
      where: { userId },
      include: {
        word: { include: { synonyms: true, antonyms: true, examples: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(favorites);
  } catch (error) { next(error); }
});

favoritesRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId as string;
    const { wordId } = z.object({ wordId: z.string() }).parse(req.body);
    const fav = await prisma.userFavorite.create({
      data: { userId, wordId },
    });
    res.status(201).json(fav);
  } catch (error) { next(error); }
});

favoritesRouter.delete('/:wordId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId as string;
    await prisma.userFavorite.deleteMany({
      where: { userId, wordId: req.params.wordId },
    });
    res.json({ success: true });
  } catch (error) { next(error); }
});
