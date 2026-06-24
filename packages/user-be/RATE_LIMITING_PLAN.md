# Rate Limiting Implementation Plan (user-be)

This plan outlines how to integrate highly-available, horizontal rate-limiting across your Express backend (`user-be`), utilizing your existing Redis infrastructure.

## 1. Prerequisites (Packages)
Install the necessary middleware on `user-be`. We will use `express-rate-limit` for the logic and `rate-limit-redis` to keep track of limits across multiple backend instances.

```bash
bun add express-rate-limit rate-limit-redis ioredis
bun add -D @types/express-rate-limit
```

## 2. Nginx Proxy Configuration (Critical Step)
Since `user-be` sits behind Nginx, Express will by default see the Nginx server's IP for *all* requests. If you apply an IP-based rate limiter without trusting the proxy, **everyone** will get blocked simultaneously.

**In `packages/user-be/index.ts`:**
Add this right after defining Express, before any rate limiters:
```typescript
// Tells Express to parse the X-Forwarded-For header set by Nginx
this.app.set('trust proxy', 1);
```

**In your Nginx config file:**
Ensure your Nginx `location /` block is forwarding the client's real IP to the Node server:
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 3. Creating the Redis Store Connector
Create a dedicated Redis client specifically for the rate limiter to avoid interfering with your queue implementations.

**Create `packages/user-be/lib/redis/rateLimiterStore.ts`:**
```typescript
import { createClient } from 'redis';
import RedisStore from 'rate-limit-redis';

export const rateLimitRedisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

rateLimitRedisClient.on('error', (err) => console.log('Rate Limit Redis Error', err));
rateLimitRedisClient.connect().catch(console.error);

export const redisStore = new RedisStore({
  // @ts-expect-error - Expected typing mismatch with new clients, but works at runtime
  sendCommand: (...args: string[]) => rateLimitRedisClient.sendCommand(args),
});
```

## 4. Defining the Limiters
Define the different tiers of rate limiters.

**Create `packages/user-be/middleware/rateLimiter.ts`:**
```typescript
import rateLimit from 'express-rate-limit';
import { redisStore } from '../lib/redis/rateLimiterStore';

// Global Rate Limiter: Applies to all routes to stop standard DDoS scraping
export const globalLimiter = rateLimit({
  store: redisStore,
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true, 
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
});

// Strict Limiter: Applies to Auth endpoints (Login/Signup) to stop brute force
export const strictAuthLimiter = rateLimit({
  store: redisStore,
  windowMs: 15 * 60 * 1000, 
  max: 10, // Max 10 login/signup attempts per IP per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});
```

## 5. Applying the Middlewares
Inject the limits into the Express app globally and specifically.

**In `packages/user-be/index.ts`:**
```typescript
import { globalLimiter } from "./middleware/rateLimiter";

private initializeMiddlewares(): void {
  this.app.set('trust proxy', 1); // Crucial for Nginx!
  // ... your existing CORS setup ...
  
  // Apply global rate limiter to all API routes
  this.app.use('/api', globalLimiter);
  
  // existing helmet, compression, express.json...
}
```

**In `packages/user-be/routes/loginUser.ts` (and `adduser.ts`):**
```typescript
import { strictAuthLimiter } from "../middleware/rateLimiter";

// Attach it directly to the sensitive route handler
router.post('/login', strictAuthLimiter, async (req, res) => {
    // ... existing login code
});
```

## 6. Frontend Handling (`user-fe` behind Vercel)
Ensure the frontend is prepared to handle the limit responses smoothly.

When the rate limit is hit, `user-be` responds with `429 Too Many Requests` instead of 200, outputting the JSON `message` we defined above.
Ensure `useLoginForm` catches this appropriately, as the current login page checks for `data.success` or specific 400/401 values. Because we mapped the output to match `{ success: false, message: "..." }`, the current standard error catching in `page.tsx` will parse it perfectly as a `submitError`.
