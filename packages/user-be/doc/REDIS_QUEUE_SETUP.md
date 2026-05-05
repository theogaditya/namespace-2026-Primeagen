# Redis Queue Setup for User Registration

## Overview
This document explains the Redis queue implementation for pushing new user data to a blockchain processing service.

## Architecture

### Flow
1. User signs up via `/api/users/signup` endpoint
2. User data is saved to the database
3. User data is pushed to Redis queue (`user:registration:queue`)
4. External blockchain process (not managed by this service) pops from the queue and processes the data

### Components

#### 1. RedisClientforUserQueue (lib/redisClient.ts)
- Dedicated Redis client for user queue operations
- Separate from other Redis clients (publish/subscribe, caching, etc.)
- Connects to Redis instance specified in `REDIS_URL` environment variable

#### 2. UserQueueService (lib/userQueueService.ts)
- Singleton service managing the user queue
- **Key Methods:**
  - `connect()`: Establishes connection to Redis
  - `pushUserToQueue(userData)`: Pushes user data to the queue (RPUSH)
  - `getQueueLength()`: Returns the current queue length
  - `disconnect()`: Gracefully closes the connection

#### 3. Queue Operations
- **Queue Name:** `user:registration:queue`
- **Push Operation:** RPUSH (adds to the end of the list)
- **Pop Operation:** LPOP (blockchain service pops from the beginning - FIFO)

### Data Format
When a user is created, the following data is pushed to the queue:
```json
{
  "id": "user_uuid",
  "email": "user@example.com",
  "phoneNumber": "+1234567890",
  "name": "John Doe",
  "aadhaarId": "xxxx-xxxx-xxxx",
  "dateOfCreation": "2025-11-30T...",
  "location": {
    "pin": "123456",
    "district": "District Name",
    "city": "City Name",
    "locality": "Locality",
    "street": "Street Address",
    "municipal": "Municipal Area",
    "state": "State Name"
  }
}
```

## Environment Setup

### Required Environment Variable
```env
REDIS_URL=redis://localhost:6379
```

For production with authentication:
```env
REDIS_URL=redis://:password@host:port
```

## Testing the Queue

### 1. Check Health Endpoint
```bash
curl http://localhost:3000/api/helth
```

Response includes queue status:
```json
{
  "status": "ok",
  "database": "ok",
  "redis": "ok",
  "queueLength": 5,
  "message": "All systems operational"
}
```

### 2. Create a User and Verify Queue
```bash
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
      "street": "Test Street",
      "municipal": "Test Municipal",
      "state": "Test State"
    }
  }'

# Check if user was added to queue
redis-cli LLEN user:registration:queue
```

### 3. Manual Queue Inspection (Redis CLI)
```bash
# Connect to Redis
redis-cli

# Check queue length
LLEN user:registration:queue

# View items in queue (without removing them)
LRANGE user:registration:queue 0 -1

# View the first item (what blockchain service will pop next)
LINDEX user:registration:queue 0
```

## Error Handling

### Queue Push Failures
If pushing to the queue fails, the user creation still succeeds. The error is logged, and you can:
1. Implement a retry mechanism
2. Store failed pushes in a dead-letter queue
3. Manually push the user data later using the user ID

### Connection Issues
The service attempts to auto-connect when pushing data. If Redis is unavailable:
- Error is logged to console
- User creation continues (queue operation is non-blocking)
- Consider implementing a health check monitor

## Monitoring

### Key Metrics to Track
1. **Queue Length:** Monitor via health endpoint or Redis directly
2. **Push Success Rate:** Check application logs for failures
3. **Redis Connection Status:** Monitor in health checks

### Recommended Alerts
- Queue length exceeds threshold (blockchain service may be down)
- Redis connection failures
- Repeated push failures

## Integration with Blockchain Service

The blockchain service should:
1. Connect to the same Redis instance
2. Use LPOP or BLPOP to retrieve user data from `user:registration:queue`
3. Process the user data (blockchain operations)
4. Handle errors independently

Example blockchain service code:
```typescript
// Example for blockchain service (not implemented here)
const client = redis.createClient({ url: REDIS_URL });
await client.connect();

// Blocking pop with 5 second timeout
while (true) {
  const data = await client.blPop('user:registration:queue', 5);
  if (data) {
    const userData = JSON.parse(data.element);
    // Process userData in blockchain
  }
}
```

## Graceful Shutdown

The service properly disconnects from Redis during shutdown:
- SIGINT (Ctrl+C)
- SIGTERM (Docker/K8s stop)

This ensures:
- No data loss
- Clean connection closure
- Proper resource cleanup

## Development Tips

1. **Local Redis:** Run Redis locally with Docker:
   ```bash
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Monitor Queue in Real-time:**
   ```bash
   watch -n 1 'redis-cli LLEN user:registration:queue'
   ```

3. **Clear Queue (Development Only):**
   ```bash
   redis-cli DEL user:registration:queue
   ```

## Troubleshooting

### Issue: Queue not populating
- Check Redis connection: `redis-cli ping`
- Verify REDIS_URL in .env
- Check application logs for errors

### Issue: Queue growing too large
- Blockchain service may be down
- Check blockchain service logs
- Verify both services connect to same Redis instance

### Issue: Duplicate entries
- Ensure blockchain service properly removes items with LPOP
- Check for multiple blockchain service instances

## Security Considerations

1. **Redis Authentication:** Use password-protected Redis in production
2. **Network Security:** Redis should not be exposed to public internet
3. **Data Sanitization:** Sensitive data (Aadhaar) is included - ensure compliance
4. **TLS/SSL:** Consider using Redis with TLS for encrypted communication
