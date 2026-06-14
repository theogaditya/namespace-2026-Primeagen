# Complaint Queue Microservice

A dedicated microservice for processing complaints from the Redis queue and creating them in the database.

## Overview

This service handles:
- Polling the Redis registration queue for new complaints
- Validating complaint data
- Creating complaints in the PostgreSQL database
- Checking for duplicate complaints
- Awarding badges to users after complaint creation
- Pushing processed complaints to the processed queue for auto-assignment

## Architecture

```
Redis (complaint:registration:queue)
         ↓
   [comp-queue service]
         ↓
   PostgreSQL (Complaint table)
         ↓
Redis (complaint:processed:queue) → Auto-Assignment Service
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `COMP_QUEUE_PORT` | Port for the service | `3005` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `NODE_ENV` | Environment mode | `development` |
| `DEFAULT_MODERATION_URL` | Moderation service URL | Optional |
| `GCP_PROJECT_ID` | GCP Project ID for Vertex AI | Optional |
| `GCP_LOCATION` | GCP Location for Vertex AI | Optional |
| `ENDPOINT_ID` | Vertex AI Endpoint ID | Optional |

## API Endpoints

### Health Check
```
GET /health
```
Returns service health status.

### Process Single Complaint
```
POST /api/processing
```
Manually trigger processing of a single complaint from the queue.

### Start Polling
```
POST /api/processing/start
```
Start automatic polling (10s interval) for complaints.

### Stop Polling
```
POST /api/processing/stop
```
Stop automatic polling.

### Get Status
```
GET /api/processing/status
```
Get current polling status and queue lengths.

## Running Locally

### Prerequisites
- Bun runtime
- PostgreSQL database
- Redis server

### Setup
```bash
# Install dependencies
bun install

# Generate Prisma client
bunx prisma generate

# Start the service
bun run dev
```

### Docker
```bash
# Build and run with docker-compose
docker-compose up --build
```

## Queue Names

- `complaint:registration:queue` - Source queue (complaints waiting to be processed)
- `complaint:processing:inprogress` - Processing queue (complaints currently being processed)
- `complaint:processed:queue` - Destination queue (processed complaints for auto-assignment)

## Processing Flow

1. **Poll** - Fetch complaint from registration queue
2. **Move** - Atomically move to processing queue (prevents duplicate processing)
3. **Validate** - Validate complaint data against schema
4. **Check Category** - Verify category exists in database
5. **Duplicate Check** - Check for existing similar complaints
6. **Create** - Create complaint in database with location
7. **Cleanup** - Remove from processing queue
8. **Badges** - Check and award badges to user
9. **Forward** - Push to processed queue for auto-assignment
