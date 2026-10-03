# 🚀 VocabMaster AI — Setup Guide

## Step 1: Add Your Gemini API Key

Open `server/.env` and replace `your_gemini_api_key_here` with your actual key:

```bash
# Get key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSy...your_actual_key...
```

## Step 2: Install Backend Dependencies

```bash
cd server
npm install
```

## Step 3: Setup Database

```bash
# Still in server/ directory:
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

## Step 4: Start the Backend Server

```bash
# Still in server/ directory:
npm run dev
# Server runs at http://localhost:3001
# Test: http://localhost:3001/api/health
```

## Step 5: Install Frontend Dependencies

```bash
# In a new terminal tab
cd client
npm install
```

## Step 6: Start the Frontend

```bash
# Still in client/ directory:
npm run dev
# App runs at http://localhost:5173
```

## Step 7: Open the App

Navigate to **http://localhost:5173**

Login with demo credentials:
- Name: `Demo`
- Username: `demo`

Or just enter any new name and username to instantly create a new account!

---

## 🔑 Test Accounts

| Role | Name | Username |
|------|------|----------|
| Admin | Admin | admin |
| Demo | Demo | demo |

---

## ⚠️ Notes

- The AI evaluation features (sentence checking, word generation) require a valid Gemini API key
- Without a Gemini key, learning/revision still works with local evaluation logic
- SQLite database file is created at `server/dev.db`
- To switch to PostgreSQL: change `DATABASE_URL` in `server/.env` and update `schema.prisma` provider to `postgresql`
