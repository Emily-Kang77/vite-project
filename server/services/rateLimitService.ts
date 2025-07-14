import { redisManager } from './redisService.js';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

const RATE_LIMITS = {
  MESSAGES: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 messages per minute
  JOINS: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 joins per minute
  GLOBAL: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute per IP
} as const;

export class RateLimitService {
  private publisher: any;

  constructor(redisManagerParam?: any) {
    // Use the provided redisManager or fall back to the shared one
    const manager = redisManagerParam || redisManager;
    this.publisher = manager.getPublisher();
  }

  /**
   * Check if a user has exceeded their rate limit for a specific action
   */
  async checkRateLimit(
    userId: string, 
    action: 'messages' | 'joins', 
    ip?: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const config = RATE_LIMITS[action.toUpperCase() as keyof typeof RATE_LIMITS];
    const key = `rate_limit:user:${userId}:${action}`;
    
    try {
      // Get current count from Redis
      const currentCount = await this.publisher.get(key);
      const count = currentCount ? parseInt(currentCount) : 0;
      
      if (count >= config.maxRequests) {
        // Rate limit exceeded
        const ttl = await this.publisher.ttl(key);
        return {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + (ttl * 1000)
        };
      }
      
      // Increment count and set TTL
      const multi = this.publisher.multi();
      multi.incr(key);
      multi.expire(key, Math.ceil(config.windowMs / 1000));
      const results = await multi.exec();
      
      const newCount = results?.[0] ? Number(results[0]) : count + 1;
      const remaining = Math.max(0, config.maxRequests - newCount);
      
      return {
        allowed: true,
        remaining,
        resetTime: Date.now() + config.windowMs
      };
      
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow the request if Redis is down
      return { allowed: true, remaining: config.maxRequests, resetTime: Date.now() + config.windowMs };
    }
  }

  /**
   * Check global rate limit by IP address
   */
  async checkGlobalRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const config = RATE_LIMITS.GLOBAL;
    const key = `rate_limit:global:${ip}`;
    
    try {
      const currentCount = await this.publisher.get(key);
      const count = currentCount ? parseInt(currentCount) : 0;
      
      if (count >= config.maxRequests) {
        const ttl = await this.publisher.ttl(key);
        return {
          allowed: false,
          remaining: 0,
          resetTime: Date.now() + (ttl * 1000)
        };
      }
      
      const multi = this.publisher.multi();
      multi.incr(key);
      multi.expire(key, Math.ceil(config.windowMs / 1000));
      const results = await multi.exec();
      
      const newCount = results?.[0] ? Number(results[0]) : count + 1;
      const remaining = Math.max(0, config.maxRequests - newCount);
      
      return {
        allowed: true,
        remaining,
        resetTime: Date.now() + config.windowMs
      };
      
    } catch (error) {
      console.error('Global rate limit check failed:', error);
      return { allowed: true, remaining: config.maxRequests, resetTime: Date.now() + config.windowMs };
    }
  }

  /**
   * Reset rate limit for a user (useful for testing or admin actions)
   */
  async resetRateLimit(userId: string, action: 'messages' | 'joins'): Promise<void> {
    const key = `rate_limit:user:${userId}:${action}`;
    try {
      await this.publisher.del(key);
      console.log(`Rate limit reset for user ${userId}, action: ${action}`);
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
    }
  }

  /**
   * Get current rate limit status for a user
   */
  async getRateLimitStatus(userId: string): Promise<{
    messages: { count: number; remaining: number; resetTime: number };
    joins: { count: number; remaining: number; resetTime: number };
  }> {
    const messagesKey = `rate_limit:user:${userId}:messages`;
    const joinsKey = `rate_limit:user:${userId}:joins`;
    
    try {
      const [messagesCount, messagesTtl, joinsCount, joinsTtl] = await Promise.all([
        this.publisher.get(messagesKey),
        this.publisher.ttl(messagesKey),
        this.publisher.get(joinsKey),
        this.publisher.ttl(joinsKey)
      ]);
      
      const messagesCountNum = messagesCount ? parseInt(messagesCount) : 0;
      const joinsCountNum = joinsCount ? parseInt(joinsCount) : 0;
      
      return {
        messages: {
          count: messagesCountNum,
          remaining: Math.max(0, RATE_LIMITS.MESSAGES.maxRequests - messagesCountNum),
          resetTime: messagesTtl > 0 ? Date.now() + (messagesTtl * 1000) : Date.now()
        },
        joins: {
          count: joinsCountNum,
          remaining: Math.max(0, RATE_LIMITS.JOINS.maxRequests - joinsCountNum),
          resetTime: joinsTtl > 0 ? Date.now() + (joinsTtl * 1000) : Date.now()
        }
      };
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
      return {
        messages: { count: 0, remaining: RATE_LIMITS.MESSAGES.maxRequests, resetTime: Date.now() },
        joins: { count: 0, remaining: RATE_LIMITS.JOINS.maxRequests, resetTime: Date.now() }
      };
    }
  }
}

export const rateLimitService = new RateLimitService(); 