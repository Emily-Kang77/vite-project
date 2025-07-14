import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

/**
 * Manages the Redis Connection and two clients: one for subscribing,
 * the other is for publishing and general use. This only focuses on pub/sub,
 * it does not track individual users.
 */
class RedisManager {
    private subscriber: RedisClientType;
    private publisher: RedisClientType;
    private messageCallbacks: Map<string, (message: string) => void> = new Map();

    constructor() {
        this.subscriber = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });

        this.publisher = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });

        this.setupSubscriber();
    }

    async connect() {
        await this.subscriber.connect();
        await this.publisher.connect();
        console.info('Redis Manager connected');
    }

    async disconnect() {
        await this.subscriber.disconnect();
        await this.publisher.disconnect();
        console.info('Redis Manager disconnected');
    }  

    private setupSubscriber() {
        this.subscriber.on('message', (channel: string, message: string) => {
            const callback = this.messageCallbacks.get(channel);
            if (callback) {
                callback(message);
            }
        });
    }

    async getSubscriberCount(roomId: string): Promise<number> {
        const channel = `room:${roomId}`;
        const result = await this.publisher.pubSubNumSub(channel);
        return result[channel] || 0;
    }

    async subscribeToRoom(roomId: string, callback: (message: string) => void) {
        const channel = `room:${roomId}`;
        if(!this.messageCallbacks.has(channel)) {
            this.messageCallbacks.set(channel, callback);
            await this.subscriber.subscribe(channel, callback);
        }
    }

    async unsubscribeFromRoom(roomId: string) {
        const channel = `room:${roomId}`;
        const count = await this.getSubscriberCount(roomId);
        if (count <= 1) {
            // We're the last subscriber, so unsubscribe
            this.messageCallbacks.delete(channel);
            await this.subscriber.unsubscribe(channel);
        }
    }

    async publishToRoom(roomId: string, message: string) {
        const channel = `room:${roomId}`;
        await this.publisher.publish(channel, message);
    }

    // Get publisher client for general Redis operations
    getPublisher(): RedisClientType {
        return this.publisher;
    }

    getSubscriber(): RedisClientType {
        return this.subscriber;
    }
}

// Export the class for reusability
export { RedisManager };



