import { prisma } from '../config/prisma.js';
import type { Message } from '@prisma/client';

/**
 * Save a message
 */
export async function saveMessage(data: {
  content: string;
  userId: string;
  roomId: string;
}): Promise<Message> {
    console.log("Inside Prisma saveMessage function")
    return await prisma.message.create({
        data,
    });
}

/**
 * Get messages by room ID
 */
export async function getMessagesByRoomId(roomId: string): Promise<Message[]> {
    return await prisma.message.findMany({
        where: {
            roomId,
        },
    });
}

/**
 * 
 */