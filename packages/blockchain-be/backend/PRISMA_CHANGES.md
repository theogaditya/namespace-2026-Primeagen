# Prisma Changes Required In Your Full Schema

You shared a large schema. To support blockchain hash sync, add the following to your existing `Complaint` model and add one new model.

## 1) Add fields in Complaint model

```prisma
model Complaint {
  // ...existing fields...

  blockchainHash      String?           @db.VarChar(66)
  blockchainBlock     BigInt?
  ipfsHash            String?
  isOnChain           Boolean           @default(false)
  blockchainStatus    BlockchainStatus  @default(PENDING)
  blockchainUpdatedAt DateTime?

  @@index([blockchainHash])
  @@index([seq])
}
```

## 2) Add enum

```prisma
enum BlockchainStatus {
  PENDING
  CONFIRMED
  FAILED
}
```

## 3) Add idempotency model

```prisma
model BlockchainSyncEvent {
  id              String          @id @default(uuid())
  entityType      String
  entityId        String
  keyPrefix       String
  blockchainHash  String          @db.VarChar(66)
  blockchainBlock BigInt?
  ipfsHash        String?
  isOnChain       Boolean         @default(true)
  payload         Json
  status          SyncEventStatus @default(PROCESSED)
  processedAt     DateTime        @default(now())

  @@unique([keyPrefix, blockchainHash])
  @@index([entityType, entityId])
  @@map("blockchain_sync_events")
}

enum SyncEventStatus {
  PROCESSED
  DUPLICATE
  FAILED
}
```

## 4) Migration command

Use this in the backend folder after schema update:

```bash
npm run prisma:migrate -- --name add_blockchain_sync_fields
```

If you cannot run migrations in your environment, ask DB admin to apply equivalent SQL.
