# Step-by-Step Commands (First Backend Setup)

Run these commands exactly.

## 1) Move to backend folder

```bash
cd backend
```

## 2) Copy env template

```bash
cp .env.example .env
```

## 3) Edit .env

Set real values:
- `DATABASE_URL`
- `BACKEND_SYNC_TOKEN`
- `BLOCKCHAIN_RPC_URL` (optional but recommended)

## 4) Generate Prisma client

```bash
npm run prisma:generate
```

## 5) Apply migration for blockchain fields

```bash
npm run prisma:migrate -- --name add_blockchain_sync_fields
```

## 6) Start backend in dev mode

```bash
npm run dev
```

## 7) Health check

```bash
curl http://localhost:4000/health
```

## 8) Test internal sync endpoint

```bash
curl -X POST http://localhost:4000/internal/blockchain/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer replace-with-strong-internal-token" \
  -d '{
    "entityType": "complaint",
    "entityId": "<complaint-id-or-seq>",
    "keyPrefix": "complaint:<complaint-id-or-seq>",
    "blockchainHash": "0x1111111111111111111111111111111111111111111111111111111111111111",
    "blockchainBlock": 12345,
    "ipfsHash": "bafy...",
    "isOnChain": true,
    "updatedAt": "2026-04-09T00:00:00.000Z"
  }'
```

## 9) Fetch complaint blockchain state

```bash
curl http://localhost:4000/api/complaints/<complaint-id-or-seq>/blockchain
```

## 10) Fetch tx detail view payload

```bash
curl http://localhost:4000/api/blockchain/tx/0x1111111111111111111111111111111111111111111111111111111111111111
```

## 11) Connect worker callback to this backend

In worker runtime env, set:

```env
BACKEND_SYNC_URL=http://<your-backend-host>:4000/internal/blockchain/sync
BACKEND_SYNC_TOKEN=replace-with-strong-internal-token
```

Then restart worker service.
