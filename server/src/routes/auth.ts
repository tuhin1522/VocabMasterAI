import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { loginOrCreateUser } from '../services/authService';
import { authLimiter } from '../middleware/rateLimiter';

export const authRouter = Router();

const loginSchema = z.object({
  name: z.string().min(2).max(100),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
});

authRouter.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, name } = loginSchema.parse(req.body);
    const result = await loginOrCreateUser(username, name);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
