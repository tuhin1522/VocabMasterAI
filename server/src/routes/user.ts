import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const userRouter = Router();
const prisma = new PrismaClient();

userRouter.use(authenticate);

userRouter.get('/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, username: true, name: true, email: true,
        dailyWordTarget: true, preferredLanguage: true, role: true, createdAt: true,
      },
    });
    if (!user) throw new AppError('User not found', 404);
    res.json(user);
  } catch (error) { next(error); }
});

const settingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  dailyWordTarget: z.number().min(5).max(50).optional(),
  preferredLanguage: z.enum(['english', 'bengali', 'both']).optional(),
});

userRouter.put('/settings', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = settingsSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: {
        id: true, username: true, name: true, email: true,
        dailyWordTarget: true, preferredLanguage: true, role: true,
      },
    });
    res.json(user);
  } catch (error) { next(error); }
});

userRouter.get('/streak', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const streaks = await prisma.userStreak.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' },
      take: 90,
    });
    res.json(streaks);
  } catch (error) { next(error); }
});
