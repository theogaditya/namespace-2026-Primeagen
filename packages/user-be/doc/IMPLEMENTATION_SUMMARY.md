# Redis Queue Implementation Summary

## What Was Implemented

### 1. **User Queue Service** (`lib/userQueueService.ts`)
   - Created a singleton service to manage Redis queue operations
   - Uses the `RedisClientforUserQueue` class from `redisClient.ts`
   - Queue name: `user:registration:queue`
   - Push operation: RPUSH (adds to end of list for FIFO)
   - Includes methods for:
     - `connect()` - Initialize Redis connection
     - `pushUserToQueue(userData)` - Push new user to queue
     - `getQueueLength()` - Get current queue size
     - `disconnect()` - Clean shutdown

### 2. **Modified Files**

#### `routes/adduser.ts`
   - Added import for `userQueueService`
   - After successful user creation, pushes user data to Redis queue
   - Queue push is wrapped in try-catch to prevent user creation failure if Redis is down
   - Data pushed includes: id, email, phoneNumber, name, aadhaarId, dateOfCreation, location

#### `bin.ts`
   - Imported `userQueueService`
   - Initializes queue connection during bootstrap
   - Added graceful shutdown for Redis in SIGINT and SIGTERM handlers

#### `routes/helth.ts`
   - Enhanced health check endpoint to include Redis status
   - Returns queue length in health check response
   - Format: `{ status, database, redis, queueLength, message }`

#### `test/unit.user.test.ts`
   - Added mock for `userQueueService` to prevent test failures
   - All existing tests continue to pass

### 3. **Documentation**
   - Created `REDIS_QUEUE_SETUP.md` with comprehensive documentation
   - Includes architecture, testing instructions, monitoring tips, and troubleshooting

## How It Works

1. **Startup**: Server connects to Redis queue during bootstrap
2. **User Creation**: When POST `/api/users/signup` succeeds:
   - User saved to database
   - User data pushed to `user:registration:queue` in Redis
   - External blockchain service pops from the queue
3. **Monitoring**: Check `/api/helth` for queue status
4. **Shutdown**: Gracefully disconnects from Redis

## Testing

### Quick Test
```bash
# Start your Redis server
redis-server

# In another terminal, start your application
cd packages/user-be
bun run dev

# Check health
curl http://localhost:3000/api/helth

# Create a user
curl -X POST http://localhost:3000/api/users/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phoneNumber": "+1234567890",
    "name": "Test User",
    "password": "SecurePass123!",
    "dateOfBirth": "1990-01-01",
    "aadhaarId": "1234-5678-9012",
    "preferredLanguage": "English",
    "disability": false,
    "location": {
      "pin": "123456",
      "district": "Test District",
      "city": "Test City",
      "locality": "Test Locality",
      "municipal": "Test Municipal",
      "state": "Test State"
    }
  }'

# Check queue in Redis
redis-cli LLEN user:registration:queue
redis-cli LRANGE user:registration:queue 0 -1
```

## Key Features

✅ **Non-blocking**: Queue failures don't prevent user creation
✅ **Singleton Pattern**: Single Redis connection managed efficiently
✅ **FIFO Queue**: First In, First Out processing
✅ **Graceful Shutdown**: Proper cleanup on server stop
✅ **Health Monitoring**: Queue status visible in health endpoint
✅ **Test Compatible**: Mocked in unit tests
✅ **Production Ready**: Error handling and logging included

## Environment Configuration

Required in `.env`:
```env
REDIS_URL=redis://localhost:6379
```

## Next Steps for Blockchain Team

The blockchain service needs to:
1. Connect to the same Redis instance
2. Pop from `user:registration:queue` using LPOP or BLPOP
3. Process the user data for blockchain operations
4. Handle errors independently

Example code for blockchain service:
```typescript
import { createClient } from '@redis/client';

const client = createClient({ url: process.env.REDIS_URL });
await client.connect();

while (true) {
  const data = await client.blPop('user:registration:queue', 5);
  if (data) {
    const userData = JSON.parse(data.element);
    // Process userData in blockchain
    console.log('Processing user:', userData.id);
  }
}
```

## Security Notes

- Aadhaar data is included in queue - ensure compliance
- Consider encrypting sensitive data before pushing to queue
- Use Redis authentication in production
- Don't expose Redis port to public internet

## Monitoring Recommendations

1. Set up alerts for queue length > threshold
2. Monitor Redis connection status
3. Track push success/failure rates
4. Log queue processing times
