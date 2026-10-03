# VocabMaster AI 🧠

An **AI-powered English Vocabulary Learning Platform** for active recall, spaced repetition, and AI-generated mnemonics — designed for Bengali-speaking learners.

## ✨ Features

- 🔐 **Secure Authentication** — JWT-based auth with hashed passwords
- 📚 **120+ Pre-loaded Words** — B1–C2 vocabulary across 8+ categories
- 🧠 **Active Recall Learning** — See word → recall → check → feedback
- 🤖 **Google Gemini AI** — Mnemonics, sentence evaluation, vocabulary generation
- 🔁 **Spaced Repetition** — Smart review scheduling based on performance
- 🔒 **Revision Lock** — New words unlock only after completing revision
- 📊 **Analytics Dashboard** — Progress charts, category performance, streaks
- 🎯 **Challenge Mode** — Timed vocabulary challenges with multiple types
- 🇧🇩 **Bengali Support** — Bengali meanings and explanations
- 📱 **Responsive Design** — Mobile-first dark mode UI
- 👑 **Admin Panel** — Word management, user overview, AI regeneration

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Node.js, TypeScript, Express |
| Database | SQLite (Prisma ORM) |
| AI | Google Gemini 1.5 Flash |
| Auth | JWT |
| Charts | Recharts |
| State | Zustand |
| Animations | Framer Motion |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A Google Gemini API key

### 1. Clone / Navigate to project
```bash
cd VocabMasterAI
```

### 2. Setup Backend
```bash
cd server
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

### 3. Setup Frontend
```bash
cd client
npm install
npm run dev
```

### 4. Open browser
- App: http://localhost:5173
- API: http://localhost:3001/api/health

## 🔑 Environment Variables

```env
# server/.env
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET=your_super_secret_jwt_key_here
GEMINI_API_KEY=your_gemini_api_key_here
CLIENT_URL=http://localhost:5173
```

## 👤 Default Accounts

| Role | Name | Username |
|------|------|----------|
| Admin | Admin | admin |
| Demo | Demo | demo |

## 📁 Project Structure

```
VocabMasterAI/
├── client/               # React frontend
│   └── src/
│       ├── api/          # Axios API client
│       ├── layouts/      # App shell layout
│       ├── pages/        # All page components
│       ├── store/        # Zustand state
│       └── types/        # TypeScript types
└── server/               # Express backend
    ├── prisma/
    │   ├── schema.prisma # Database schema
    │   └── seed.ts       # 120+ vocabulary words
    └── src/
        ├── ai/           # Gemini AI service
        ├── middleware/   # Auth, rate limiting, errors
        ├── routes/       # All API routes
        └── services/     # Business logic
```

## 📡 API Endpoints

```
POST /api/auth/register
POST /api/auth/login
GET  /api/dashboard
GET  /api/learning/today
POST /api/learning/submit
POST /api/learning/sentence/evaluate
POST /api/learning/meaning/evaluate
GET  /api/revision/today
POST /api/revision/submit
GET  /api/words
GET  /api/words/:id
POST /api/words/generate
GET  /api/analytics
GET  /api/favorites
POST /api/challenge/start
GET  /api/admin/stats      (admin only)
```

## 🎯 Learning Flow

```
Register → Set Daily Target → Learn Words
    ↓
Next Day → Revision Required → Complete Revision
    ↓
New Words Unlocked → Learn → Repeat
    ↓
Spaced Repetition → Mastery
```
