import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/user';
import { wordsRouter } from './routes/words';
import { learningRouter } from './routes/learning';
import { revisionRouter } from './routes/revision';
import { analyticsRouter } from './routes/analytics';
import { favoritesRouter } from './routes/favorites';
import { dashboardRouter } from './routes/dashboard';
import { adminRouter } from './routes/admin';
import { challengeRouter } from './routes/challenge';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security
app.use(helmet());

// Allowed origins: Vite dev server + Tauri desktop webview origins
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'tauri://localhost',          // Tauri v2 production webview
  'http://localhost',           // Tauri v2 on some platforms
  'https://tauri.localhost',    // Tauri v2 alternative
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, Tauri internals)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/words', wordsRouter);
app.use('/api/learning', learningRouter);
app.use('/api/revision', revisionRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/admin', adminRouter);
app.use('/api/challenge', challengeRouter);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 VocabMaster server running on http://localhost:${PORT}`);
});

export default app;
