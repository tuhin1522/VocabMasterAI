import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getDashboardData } from '../services/learningService';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await getDashboardData(req.userId!);
    res.json(data);
  } catch (error) { next(error); }
});
