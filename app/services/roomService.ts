export interface Room {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  members?: any[];
  messages?: any[];
}

const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Fetch all rooms from the backend
 */
export async function fetchRooms(): Promise<Room[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching rooms:', error);
    throw error;
  }
}

/**
 * Create a new room
 */
export async function createRoom(data: { name: string; description?: string }): Promise<Room> {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
}

/**
 * Join a room
 */
export async function joinRoom(roomId: string, userId: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error joining room:', error);
    throw error;
  }
} 