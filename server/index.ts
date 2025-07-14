import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import dotenv from "dotenv";
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken";
import { PrismaClient } from '@prisma/client';
import { getAllUsers, createUser } from './services/userService.js';
import { saveMessage } from './services/messageService.js';
import { RedisManager } from './config/redis.js';
import { RateLimitService } from './services/rateLimitService.js';

dotenv.config()

const app: Express = express();
const server = createServer(app);

const prisma = new PrismaClient();
const redisManager = new RedisManager();
let rateLimitService: RateLimitService;

// Initialize function to avoid top-level await
async function initializeServices() {
    try {
        await redisManager.connect();
        console.log('Redis connected successfully');
        
        // Create rate limit service with connected Redis manager
        rateLimitService = new RateLimitService(redisManager);
        console.log('Rate limit service initialized');
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
    }
}

// Initialize services
initializeServices();

const publisher = redisManager.getPublisher();
const subscriber = redisManager.getSubscriber();

// Subscribe to Redis channel for messages
subscriber.subscribe('chat:messages', (message) => {
    try {
        const messageData = JSON.parse(message);
        console.log("Redis: Received message from channel 'chat:messages':", messageData);
        
        // Broadcast message only to users in the specific room
        io.to(messageData.roomId).emit("message", messageData);
        console.log(`Redis: Message broadcasted to room '${messageData.roomId}'`);
    } catch (error) {
        console.error("Redis: Error parsing message:", error);
    }
});

// State 
interface UserInfo {
    id: string;
    username: string;
    socketId: string;
}

interface RoomUsers {
    [roomId: string]: Map<string, UserInfo>; // userId -> UserInfo
}

const UsersState = {
    roomUsers: {} as RoomUsers,
    
    // Add user to a specific room
    addUserToRoom: function(roomId: string, userInfo: UserInfo) {
        if (!this.roomUsers[roomId]) {
            this.roomUsers[roomId] = new Map();
        }
        this.roomUsers[roomId].set(userInfo.id, userInfo);
        console.log(`Added user ${userInfo.username} (${userInfo.id}) to room ${roomId}`);
        console.log(`Room ${roomId} now has ${this.roomUsers[roomId].size} users`);
    },
    
    // Remove user from a specific room
    removeUserFromRoom: function(roomId: string, userId: string) {
        if (this.roomUsers[roomId]) {
            const userInfo = this.roomUsers[roomId].get(userId);
            if (userInfo) {
                this.roomUsers[roomId].delete(userId);
                console.log(`Removed user ${userInfo.username} (${userId}) from room ${roomId}`);
                console.log(`Room ${roomId} now has ${this.roomUsers[roomId].size} users`);
                
                // Clean up empty room
                if (this.roomUsers[roomId].size === 0) {
                    delete this.roomUsers[roomId];
                    console.log(`Cleaned up empty room ${roomId}`);
                }
            }
        }
    },
    
    // Remove user from all rooms (when socket disconnects)
    removeUserFromAllRooms: function(userId: string) {
        Object.keys(this.roomUsers).forEach(roomId => {
            this.removeUserFromRoom(roomId, userId);
        });
    },
    
    // Get users in a specific room
    getUsersInRoom: function(roomId: string): UserInfo[] {
        if (!this.roomUsers[roomId]) {
            return [];
        }
        return Array.from(this.roomUsers[roomId].values());
    },
    
    // Check if user is in a specific room
    isUserInRoom: function(roomId: string, userId: string): boolean {
        return this.roomUsers[roomId]?.has(userId) || false;
    },
    
    // Get all users across all rooms (for debugging)
    getAllUsers: function(): { [roomId: string]: UserInfo[] } {
        const result: { [roomId: string]: UserInfo[] } = {};
        Object.keys(this.roomUsers).forEach(roomId => {
            result[roomId] = this.getUsersInRoom(roomId);
        });
        return result;
    }
}

// CORS says, allow the frontend at port 5173 to connect to the server at port 3000.
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5173"],
    }
});

// Set the application to trust the reverse proxy
app.set("trust proxy", true);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ 
    origin: ["http://localhost:5173"], 
    credentials: true 
}));
// Temporarily disable helmet to test if it's blocking requests
// app.use(helmet());

// Test route to verify HTTP is working
app.get("/api/test", (req: Request, res: Response) => {
    console.log('Backend: Test route hit!');
    res.json({ message: "Backend is working" });
});

// Prisma API endpoints
app.get("/api/users", async (req: Request, res: Response) => {
    try {
        const users = await getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

app.post("/api/users", async (req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body;
        const user = await createUser({ username, email, password });
        res.status(201).json(user);
    } catch (error) {
        res.status(500).json({ error: "Failed to create user" });
    }
});

app.get("/api/rooms", async (req: Request, res: Response) => {
    try {
        const rooms = await prisma.room.findMany({
            include: { members: true, messages: true }
        });
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch rooms" });
    }
});


// Get messages for a specific room
app.get("/api/rooms/:roomId/messages", async (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        console.log('Backend: Fetching messages for room ID:', roomId);
        
        // First check if the room exists
        const room = await prisma.room.findUnique({
            where: { id: roomId }
        });
        
        if (!room) {
            console.log('Backend: Room not found:', roomId);
            return res.status(404).json({ error: "Room not found" });
        }
        
        const messages = await prisma.message.findMany({
            where: { roomId },
            include: { user: true, room: true },
            orderBy: { createdAt: 'asc' }
        });
        
        console.log('Backend: Found messages:', messages.length, 'for room:', roomId);
        console.log('Backend: Messages array:', messages);
        console.log('Backend: Sending response with length:', JSON.stringify(messages).length);
        res.json(messages);
    } catch (error) {
        console.error('Error fetching room messages:', error);
        res.status(500).json({ error: "Failed to fetch room messages" });
    }
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
})

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Debug: Listen for all events (commented out as onAny might not be available)
    // socket.onAny((eventName, ...args) => {
    //     console.log(`Server: Received event '${eventName}' with data:`, args);
    // });
    
    // Set up all event listeners immediately when socket connects
    setupSocketEventListeners(socket);
    
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        // Remove user from all rooms when they disconnect
        // We need to find the user by socket ID and remove them
        Object.keys(UsersState.roomUsers).forEach(roomId => {
            const usersInRoom = UsersState.getUsersInRoom(roomId);
            usersInRoom.forEach(userInfo => {
                if (userInfo.socketId === socket.id) {
                    UsersState.removeUserFromRoom(roomId, userInfo.id);
                }
            });
        });
    });
});

// Function to set up event listeners for a socket. This also handles 
// the user sending messages, instead of using a REST endpoint.
function setupSocketEventListeners(socket: any) {
    // Handle user joining chat
    socket.on("join", async (data: any) => {
        console.log("Server: Received join event with data:", data);
        const { username, userId, roomId } = data;
        
        console.log("Server: Processing join - username:", username, "userId:", userId, "roomId:", roomId);
        
        // Check rate limit for joins
        if (!rateLimitService) {
            console.error('Rate limit service not initialized');
            socket.emit("joinError", { error: "Server error - rate limiting unavailable" });
            return;
        }
        
        const clientIp = socket.handshake.address;
        const rateLimitResult = await rateLimitService.checkRateLimit(userId, 'joins', clientIp);
        
        if (!rateLimitResult.allowed) {
            console.log(`Rate limit exceeded for user ${userId} - joins`);
            socket.emit("joinError", { 
                error: "Rate limit exceeded. Too many room joins. Please wait before trying again.",
                resetTime: rateLimitResult.resetTime
            });
            return;
        }
        
        // Validate that the user exists
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            
            if (!user) {
                console.error("User not found:", userId);
                socket.emit("joinError", { error: "User not found" });
                return;
            }
            
            console.log(`User ${user.username} (${user.id}) joining room: ${roomId}`);
            
            // Add user to the users list (avoid duplicates)
            if (!UsersState.isUserInRoom(roomId, user.id)) {
                UsersState.addUserToRoom(roomId, { id: user.id, username: user.username, socketId: socket.id });
            }
            
            // Join the specific room
            socket.join(roomId);
            console.log(`User ${user.username} successfully joined room ${roomId}`);
            
            // Broadcast to room that user joined
            io.to(roomId).emit("userJoined", { user: user.username });
            
            // Send current users list to the new user
            const usersInRoom = UsersState.getUsersInRoom(roomId);
            console.log(`Sending userList to ${user.username} for room ${roomId}:`, usersInRoom);
            socket.emit("userList", usersInRoom);
            
            // Send success confirmation
            console.log(`Sending joinSuccess to ${user.username} for room ${roomId}`);
            socket.emit("joinSuccess", { roomId, user: user.username });
            console.log(`joinSuccess event sent to socket ${socket.id}`);
            
        } catch (error) {
            console.error("Error joining room:", error);
            socket.emit("joinError", { error: "Failed to join room" });
        }
    });
    
    // Handle user leaving
    socket.on("leave", (data: any) => {
        const { userId, roomId } = data;
        console.log(`User ${userId} leaving room: ${roomId}`);
        
        // Remove user from the specific room
        if (userId && roomId) {
            UsersState.removeUserFromRoom(roomId, userId);
            
            // Broadcast to room that user left
            io.to(roomId).emit("userLeft", { userId });
            
            // Send updated user list to remaining users in the room
            const updatedUsersInRoom = UsersState.getUsersInRoom(roomId);
            console.log(`Sending updated userList to room ${roomId} after user left:`, updatedUsersInRoom);
            io.to(roomId).emit("userList", updatedUsersInRoom);
        }
    });
    
    // Send a message 
    socket.on("message", async (data: any) => {
        console.log("Message received:", data);
        console.log("Message data being saved:", {
            content: data.text,
            userId: data.userId || 'unknown',
            roomId: data.roomId || 'general'
        });
        
        // Check rate limit for messages
        if (!rateLimitService) {
            console.error('Rate limit service not initialized');
            socket.emit("messageError", { error: "Server error - rate limiting unavailable" });
            return;
        }
        
        const clientIp = socket.handshake.address;
        const rateLimitResult = await rateLimitService.checkRateLimit(data.userId, 'messages', clientIp);
        
        if (!rateLimitResult.allowed) {
            console.log(`Rate limit exceeded for user ${data.userId} - messages`);
            socket.emit("messageError", { 
                error: "Rate limit exceeded. Too many messages. Please wait before sending another message.",
                resetTime: rateLimitResult.resetTime
            });
            return;
        }
        
        // Validate that the user exists before saving
        try {
            const user = await prisma.user.findUnique({
                where: { id: data.userId }
            });
            
            if (!user) {
                console.error("User not found:", data.userId);
                return;
            }
            
            // Save message to database
            const savedMessage = await saveMessage({
                content: data.text,
                userId: data.userId, // Use the validated user ID
                roomId: data.roomId || 'general',
            });
            
            console.log("Message saved to database:", savedMessage);
            
            // Prepare message for Redis
            const messageToPublish = {
                ...data,
                id: savedMessage.id,
                createdAt: savedMessage.createdAt,
                roomId: data.roomId || 'general'
            };
            
            // Broadcast message directly to room via Socket.IO
            io.to(data.roomId || 'general').emit("message", messageToPublish);
            console.log(`Message broadcasted to room '${data.roomId || 'general'}'`);

            
        } catch (error) {
            console.error("Error saving message:", error);
            console.error("Error details:", {
                message: error.message,
                code: error.code,
                meta: error.meta
            });
            // Still broadcast the message even if save fails
            io.emit("message", data);
        }
    });
}

// Create a new room
app.post("/api/rooms", async (req: Request, res: Response) => {
    try {
        const { name, description } = req.body;
        const room = await prisma.room.create({
            data: {
                name,
                description
            }
        });
        res.status(201).json(room);
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({ error: "Failed to create room" });
    }
});

app.post("/api/users/register", async(req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });
        
        if (existingUser) {
            return res.status(400).json({ error: "Username or email already exists" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword
            }
        });
        
        const token = jwt.sign({ userId: user.id, username }, process.env.JWT_SECRET!, { expiresIn: "1h" });
        res.status(201).json({ 
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: "Failed to register user" });
    }
});

app.post("/api/users/login", async(req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        
        // Find user by username
        const user = await prisma.user.findUnique({
            where: { username }
        });
        
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        
        const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET!, { expiresIn: "1h" });
        res.json({ 
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: "Failed to login" });
    }
});

// Get current user data from JWT token
app.get("/api/users/me", async(req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: "No token provided" });
        }
        
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });
        
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(401).json({ error: "Invalid token" });
    }
});

// Debug endpoint to get users in a specific room
app.get("/api/rooms/:roomId/users", async(req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        const usersInRoom = UsersState.getUsersInRoom(roomId);
        res.json({
            roomId,
            users: usersInRoom,
            totalUsers: usersInRoom.length
        });
    } catch (error) {
        console.error('Get room users error:', error);
        res.status(500).json({ error: "Failed to get room users" });
    }
});

// Debug endpoint to get all users across all rooms
app.get("/api/debug/users", async(req: Request, res: Response) => {
    try {
        const allUsers = UsersState.getAllUsers();
        res.json({
            allUsers,
            totalRooms: Object.keys(allUsers).length
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: "Failed to get all users" });
    }
});

// Get rate limit status for a user
app.get("/api/users/:userId/rate-limits", async(req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const status = await rateLimitService.getRateLimitStatus(userId);
        res.json(status);
    } catch (error) {
        console.error('Get rate limit status error:', error);
        res.status(500).json({ error: "Failed to get rate limit status" });
    }
});

// Reset rate limit for a user (admin endpoint)
app.post("/api/users/:userId/rate-limits/reset", async(req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { action } = req.body; // 'messages' or 'joins'
        
        if (!action || !['messages', 'joins'].includes(action)) {
            return res.status(400).json({ error: "Invalid action. Must be 'messages' or 'joins'" });
        }
        
        await rateLimitService.resetRateLimit(userId, action as 'messages' | 'joins');
        res.json({ message: `Rate limit reset for user ${userId}, action: ${action}` });
    } catch (error) {
        console.error('Reset rate limit error:', error);
        res.status(500).json({ error: "Failed to reset rate limit" });
    }
});



// Swagger UI

// Error handlers


export { app };