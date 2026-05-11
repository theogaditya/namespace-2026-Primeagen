(# User-be Queue Workflow)

This document explains how the Redis queues work in `user-be` for complaint ingestion and handoff to `admin-be`.

**Quick overview**
- A user POSTs a complaint to `POST /api/complaints`.
- The complaint JSON is first pushed to the registration queue: `complaint:registration:queue`.
- A background poller in `user-be` peeks at the registration queue, validates and processes the complaint.
- If the complaint passes validation and DB constraints, `user-be` creates the complaint and its `location` in the database inside a transaction.
- After successful DB creation, `user-be` pushes a simplified complaint object to the processed queue: `complaint:processed:queue` for downstream consumers (for example `admin-be` auto-assignment).
- If the complaint is invalid (bad JSON / fails validation / foreign-key or DB constraint error) it is removed from the registration queue and moved to the dead-letter queue: `complaint:assignment:malformed` (or simply popped and logged), so it won't block the queue.

**Detailed steps (example run)**
1. Ensure the DB is empty (no complaints) so you can clearly observe the flow.
2. Issue the following curl to submit a complaint:

```bash
curl -X POST 'http://localhost:3000/api/complaints' \
	-H 'Content-Type: application/json' \
	-H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5ZTAzZDcxNC0xYTJmLTRhNDUtOTc0MC05OGYxYTMzMTE1YWIiLCJlbWFpbCI6InVzZXIubm92MzAuMjAyNUBleGFtcGxlLmNvbSIsIm5hbWUiOiJOb3ZlbWJlciBVc2VyIiwiaWF0IjoxNzY0NjA3MzE5LCJleHAiOjE3NjQ2OTM3MTl9.kB7ENj0zHUIr1tikJT3rynoHhPYpsKwgm7WV5ofSuWA' \
	-d '{
		"complainantId": "9e03d714-1a2f-4a45-9740-98f1a33115ab",
		"categoryId": "c953f48a-9c65-4560-a9af-0771d46e8166",
		"subCategory": "Water Leakage",
		"description": "There is a major water leakage on the main road causing traffic issues",
		"urgency": "HIGH",
		"assignedDepartment": "WATER_SUPPLY_SANITATION",
		"isPublic": true,
		"location": {
			"pin": "560001",
			"district": "Ranchi",
			"city": "Ranchi",
			"locality": "Lewis Road",
			"street": "5th Block"
		}
	}'
```

3. Right after the API returns, the complaint JSON will be in Redis key `complaint:registration:queue` (it may be pushed by the request handler before DB creation depending on configuration).
4. The poller in `packages/user-be/routes/complaintProcessing.ts` runs every 10 seconds and does the following:
	 - Connects to Redis and peeks at the first list element (`lIndex(..., 0)`).
	 - Validates the payload using Zod schema.
	 - If validation fails, it `lPop`s the item and moves it to the dead-letter queue (or logs and drops it).
	 - If validation passes, it attempts to create the `complaint` and nested `location` inside a Prisma transaction.
	 - On successful DB write, it pushes a simplified object to `complaint:processed:queue` and `lPop`s the registration queue to remove the original item.
	 - If a DB constraint error occurs (Prisma P2003, unique constraint, missing FK, etc.), the poller pops the invalid item from the registration queue and logs the error. This prevents the same bad payload from being retried forever.

5. `admin-be` (or any other service) can consume from `complaint:processed:queue` to perform auto-assignment or other downstream tasks. `admin-be` also exposes polling helpers and endpoints to start/stop polling.

**Behavior notes**
- Poll interval: `user-be` uses a 10-second interval; it peeks first and only removes an item after successful processing. This makes the system resistant to partial failures.
- Dead-letter handling: malformed or DB-failing complaints are removed from the registration queue and optionally pushed to `complaint:assignment:malformed` for further inspection.
- Idempotency: the poller checks for duplicate complaints (by complainant/subCategory/description) and removes duplicates to avoid double-creation.

If you want, I can also add a small note on how to inspect the queues via `redis-cli` or how to run `prisma studio` to verify created complaints.

