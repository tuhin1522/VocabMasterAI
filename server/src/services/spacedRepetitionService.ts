import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REVIEW_INTERVALS = [1, 2, 4, 7, 14, 30]; // days

export function calculateNextReview(reviewCount: number, isCorrect: boolean): Date {
  const now = new Date();
  let intervalDays: number;

  if (!isCorrect) {
    // Wrong answer: reset to shorter interval
    intervalDays = reviewCount > 2 ? 1 : 0.5;
  } else {
    const idx = Math.min(reviewCount, REVIEW_INTERVALS.length - 1);
    intervalDays = REVIEW_INTERVALS[idx];
  }

  const next = new Date(now);
  next.setTime(next.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return next;
}

export function calculateMasteryLevel(
  correctCount: number,
  incorrectCount: number,
  reviewCount: number,
  hintCount: number
): number {
  if (reviewCount === 0) return 0;

  const total = correctCount + incorrectCount;
  if (total === 0) return 0;

  const accuracy = correctCount / total;
  const hintPenalty = Math.min(hintCount * 5, 20);
  const reviewBonus = Math.min(reviewCount * 3, 15);

  const score = accuracy * 100 - hintPenalty + reviewBonus;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getWordStatus(masteryLevel: number): string {
  if (masteryLevel >= 95) return 'mastered';
  if (masteryLevel >= 80) return 'strong';
  if (masteryLevel >= 60) return 'developing';
  if (masteryLevel >= 40) return 'learning';
  return 'weak';
}

export async function getPendingRevisions(userId: string): Promise<number> {
  const now = new Date();
  const count = await prisma.userWord.count({
    where: {
      userId,
      firstLearnedAt: { not: null },
      nextReviewAt: { lte: now },
      status: { not: 'mastered' },
    },
  });
  return count;
}

export async function getRevisionWords(userId: string, limit = 20) {
  const now = new Date();
  return prisma.userWord.findMany({
    where: {
      userId,
      firstLearnedAt: { not: null },
      nextReviewAt: { lte: now },
      status: { not: 'mastered' },
    },
    include: {
      word: {
        include: {
          synonyms: true,
          antonyms: true,
          examples: true,
        },
      },
    },
    orderBy: [{ masteryLevel: 'asc' }, { nextReviewAt: 'asc' }],
    take: limit,
  });
}

export function generateQuestionType(reviewCount: number): string {
  const types = [
    'meaning',        // Show word, ask meaning
    'reverse',        // Show meaning, ask word
    'synonym',        // Show word, ask synonym
    'antonym',        // Show word, ask antonym
    'fill_blank',     // Fill in the blank
    'mcq_meaning',    // MCQ for meaning
    'mcq_synonym',    // MCQ for synonym
    'mcq_antonym',    // MCQ for antonym
    'sentence',       // Create a sentence
  ];

  // Beginners get simpler types; advanced learners get all types
  if (reviewCount < 2) {
    return types[Math.floor(Math.random() * 3)]; // first 3 types
  }
  return types[Math.floor(Math.random() * types.length)];
}

export async function updateUserWordAfterReview(
  userId: string,
  wordId: string,
  isCorrect: boolean,
  hintUsed: boolean
) {
  const existing = await prisma.userWord.findUnique({
    where: { userId_wordId: { userId, wordId } },
  });

  if (!existing) return;

  const reviewCount = existing.reviewCount + 1;
  const correctCount = existing.correctCount + (isCorrect ? 1 : 0);
  const incorrectCount = existing.incorrectCount + (isCorrect ? 0 : 1);
  const hintCount = existing.hintCount + (hintUsed ? 1 : 0);

  const masteryLevel = calculateMasteryLevel(correctCount, incorrectCount, reviewCount, hintCount);
  const status = getWordStatus(masteryLevel);
  const nextReviewAt = calculateNextReview(reviewCount, isCorrect);

  await prisma.userWord.update({
    where: { userId_wordId: { userId, wordId } },
    data: {
      reviewCount,
      correctCount,
      incorrectCount,
      hintCount,
      masteryLevel,
      status,
      lastReviewedAt: new Date(),
      nextReviewAt,
    },
  });
}
