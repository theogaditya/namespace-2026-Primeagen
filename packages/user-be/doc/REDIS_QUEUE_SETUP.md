## Redis queues used by user-be

This service uses Redis lists as simple FIFO queues. There are currently two application queues implemented in `packages/user-be/lib/redis`:

- `user:registration:queue` — used to enqueue newly created user objects for downstream processing (blockchain or other async processing).
- `complaint:registration:queue` — used to enqueue complaint records for asynchronous processing.

The implementation uses the official `@redis/client` and performs RPUSH to add items to a list, and downstream processors are expected to use LPOP/BLPOP to consume items.

Files of interest
- `lib/redis/redisClient.ts` — creates dedicated Redis clients (publish/subscribe, caching, and dedicated clients for each queue).
- `lib/redis/userQueueService.ts` — singleton service for pushing users to `user:registration:queue` (rPush, lLen, connect, disconnect).
- `lib/redis/complaintQueueService.ts` — singleton service for pushing complaints to `complaint:registration:queue`.
- `lib/redis/tokenBlacklistService.ts` — simple key/value usage for token blacklist with a `token_blacklist:` prefix.

Quick architecture summary
1. API endpoint (e.g., user signup) creates the DB record.
2. The service pushes a JSON string of the payload to a Redis list via RPUSH.
3. A downstream worker/process (blockchain processor, complaint processor) consumes items with LPOP/BLPOP and processes them.

Environment / connection

Required env var:

```env
REDIS_URL=redis://localhost:6379
```

For a password-protected instance:

```env
REDIS_URL=redis://:password@hostname:6379
```

Notes from the codebase

- `bin.ts` connects both `userQueueService` and `complaintQueueService` at startup so those clients are available when the server runs.
- `tokenBlacklistService` uses the key prefix `token_blacklist:` and `SETEX`/`GET` semantics to store blacklisted JWTs until they expire.

How to push items (examples from services)

User queue (service):

```ts
// userQueueService.pushUserToQueue(userData)
await client.rPush('user:registration:queue', JSON.stringify(userData));
```

Complaint queue (service):

```ts
// complaintQueueService.pushComplaintToQueue(complaintData)
await client.rPush('complaint:registration:queue', JSON.stringify(complaintData));
```

How to consume items (downstream worker)

Simple blocking pop loop (pseudo/TS):

```ts
const client = createClient({ url: process.env.REDIS_URL });
await client.connect();

while (true) {
  // blocks for up to 5 seconds; returns when an element is present
  const result = await client.blPop('user:registration:queue', 5);
  if (result) {
    // result.element contains the JSON payload
    const payload = JSON.parse(result.element);
    // process payload...
  }
}
```

Health checks and quick tests

- Health endpoint (`/api/helth`) reports Redis status and queue length. `bin.ts` initializes queue clients at startup.
- Inspect queue length:

```bash
redis-cli LLEN user:registration:queue
redis-cli LLEN complaint:registration:queue
```

- Inspect items (development only):

```bash
redis-cli LRANGE user:registration:queue 0 -1
```

Local Redis for development

```bash
docker run -d -p 6379:6379 --name local-redis redis:alpine
```

Monitoring & alerts

- Monitor queue length and alert if it crosses a threshold (indicates downstream worker backlog).
- Monitor Redis connection errors in logs.
- Track push failures (exceptions when rPush fails); consider telemetry/metrics for success/failure counts.

Errors, retries, and DLQ ideas

Current behavior in the service:
- If the push to Redis fails the service currently logs and (in some code paths) rethrows. The HTTP request may still succeed depending on where the call is used. Review call sites to confirm synchronous behavior.

Recommended improvements:
- Add a small retry with exponential backoff for transient Redis errors when pushing.
- Implement a dead-letter queue (DLQ) pattern for items that repeatedly fail to be pushed or processed. Example DLQ names:
  - `user:registration:dlq`
  - `complaint:registration:dlq`

Token blacklist service

- Prefix used: `token_blacklist:`
- Methods: `blacklistToken(token, expiresInSeconds)` stores a key with TTL via `SETEX`, `isBlacklisted(token)` checks existence.

Security & operational notes

- Do not expose Redis directly to the public internet; put it in the same VPC or behind a bastion.
- Use AUTH / password for production and consider TLS if your Redis provider supports it.
- Sensitive fields (like Aadhaar) are enqueued as JSON strings — ensure this fits your compliance requirements. Consider minimizing what you push to queues when possible (e.g., push an ID and let the worker rehydrate from DB).

Troubleshooting checklist

1. redis-cli PING -> `PONG`
2. Confirm `REDIS_URL` in process env used by the service
3. Check application logs for `Redis Client Error` messages
4. Check `LLEN` for queue growth
5. Verify downstream worker is running and reading the same queue name

Quick commands summary

```bash
# Run Redis locally
docker run -d -p 6379:6379 --name local-redis redis:alpine

# Check queue lengths
redis-cli LLEN user:registration:queue
redis-cli LLEN complaint:registration:queue

# View items (dev only)
redis-cli LRANGE user:registration:queue 0 -1

# Clear a queue (dev only)
redis-cli DEL user:registration:queue
```


