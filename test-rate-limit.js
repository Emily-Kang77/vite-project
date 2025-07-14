import { RateLimitService } from './server/services/rateLimitService.js';
import { RedisManager } from './server/config/redis.js';

async function testRateLimiting() {
  console.log('🧪 Testing Rate Limiting...\n');

  // Create and connect to Redis
  console.log('Creating Redis connection...');
  const redisManager = new RedisManager();
  await redisManager.connect();
  console.log('✅ Redis connected\n');

  // Create rate limit service with connected Redis
  const rateLimitService = new RateLimitService(redisManager);

  const testUserId = 'test-user-123';
  const testIp = '127.0.0.1';

  // Test 1: Check initial rate limit status
  console.log('1. Checking initial rate limit status...');
  const initialStatus = await rateLimitService.getRateLimitStatus(testUserId);
  console.log('Initial status:', initialStatus);

  // Test 2: Test message rate limiting
  console.log('\n2. Testing message rate limiting...');
  for (let i = 1; i <= 12; i++) {
    const result = await rateLimitService.checkRateLimit(testUserId, 'messages', testIp);
    console.log(`Message ${i}: ${result.allowed ? '✅ Allowed' : '❌ Blocked'} (${result.remaining} remaining)`);
    
    if (!result.allowed) {
      console.log(`   Reset time: ${new Date(result.resetTime).toLocaleTimeString()}`);
      break;
    }
  }

  // Test 3: Test join rate limiting
  console.log('\n3. Testing join rate limiting...');
  for (let i = 1; i <= 7; i++) {
    const result = await rateLimitService.checkRateLimit(testUserId, 'joins', testIp);
    console.log(`Join ${i}: ${result.allowed ? '✅ Allowed' : '❌ Blocked'} (${result.remaining} remaining)`);
    
    if (!result.allowed) {
      console.log(`   Reset time: ${new Date(result.resetTime).toLocaleTimeString()}`);
      break;
    }
  }

  // Test 4: Test global rate limiting
  console.log('\n4. Testing global rate limiting...');
  for (let i = 1; i <= 5; i++) {
    const result = await rateLimitService.checkGlobalRateLimit(testIp);
    console.log(`Global request ${i}: ${result.allowed ? '✅ Allowed' : '❌ Blocked'} (${result.remaining} remaining)`);
  }

  // Test 5: Reset rate limits
  console.log('\n5. Resetting rate limits...');
  await rateLimitService.resetRateLimit(testUserId, 'messages');
  await rateLimitService.resetRateLimit(testUserId, 'joins');
  
  const finalStatus = await rateLimitService.getRateLimitStatus(testUserId);
  console.log('Final status after reset:', finalStatus);

  console.log('\n✅ Rate limiting test completed!');
  
  // Cleanup: disconnect from Redis
  console.log('Disconnecting from Redis...');
  await redisManager.disconnect();
  console.log('✅ Redis disconnected');
}

// Run the test
testRateLimiting().catch(console.error); 