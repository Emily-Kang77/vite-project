import { prisma } from '../config/prisma.js';
import type { User } from '@prisma/client';

/**
 * Create a new user
 */
export async function createUser(data: {
  username: string;
  email: string;
  password: string;
}): Promise<User> {
  return await prisma.user.create({
    data,
  });
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Find user by username
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { username },
  });
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  return await prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<User[]> {
  return await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update user
 */
export async function updateUser(
  id: string,
  data: Partial<Pick<User, 'username' | 'email'>>
): Promise<User> {
  return await prisma.user.update({
    where: { id },
    data,
  });
}

/**
 * Delete user
 */
export async function deleteUser(id: string): Promise<User> {
  return await prisma.user.delete({
    where: { id },
  });
} 