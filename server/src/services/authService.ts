import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

export async function loginOrCreateUser(username: string, name: string) {
  let user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    // Generate dummy values for schema-required fields
    const passwordHash = await bcrypt.hash('dummy_password', 10);
    user = await prisma.user.create({
      data: {
        username,
        name,
        email: `${username}@vocabmaster.local`,
        passwordHash,
      },
    });
  }

  const token = generateToken(user.id, user.role);
  return { user: sanitizeUser(user), token };
}

function generateToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
}

function sanitizeUser(user: { id: string; username: string; name: string; email: string; dailyWordTarget: number; preferredLanguage: string; role: string; createdAt: Date }) {
  const { ...rest } = user;
  return {
    id: rest.id,
    username: rest.username,
    name: rest.name,
    email: rest.email,
    dailyWordTarget: rest.dailyWordTarget,
    preferredLanguage: rest.preferredLanguage,
    role: rest.role,
    createdAt: rest.createdAt,
  };
}
