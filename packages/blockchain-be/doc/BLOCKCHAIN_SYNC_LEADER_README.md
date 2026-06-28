# Blockchain Sync Flow - Leader README

This document explains the blockchain integration process end-to-end for grievance complaints, including schema updates and API changes.

## Goal

Enable citizens and leadership to verify that a complaint was actually registered on blockchain, not only in the database.

## End-to-End Process

1. User submits a complaint in the main application.
2. Complaint is saved in database first with blockchain status as pending.
3. Main app pushes a queue message for blockchain processing.
4. Blockchain worker picks the message from Redis queue.
5. Worker uploads metadata to IPFS (optional, depending on payload flow).
6. Worker writes complaint record on Sepolia contract and waits for mining.
7. Worker calls internal sync endpoint with tx hash and block details.
8. Sync backend updates complaint blockchain fields in DB.
9. Frontend calls public API to show live blockchain verification to user.

## What User Sees

The frontend should automatically call blockchain status endpoint when a user opens complaint details.

Important: this is a live chain check, not only a database check. The live endpoint fetches transaction and receipt from Sepolia RPC and returns chain verification status.

- If chain verification is `VERIFIED`: show "Registered on blockchain".
- If status is `PENDING` or `NO_TX_HASH`: show "Blockchain registration in progress".
- If status is `FAILED`, `TX_NOT_FOUND`, `MISMATCH_CONTRACT`, or `ERROR`: show "Verification issue" and allow retry/help action.

User should not be required to manually enter transaction hash in normal flow.

## Sepolia Fetch Confirmation

Live verification is performed through:

- RPC provider URL configured in backend environment (`BLOCKCHAIN_RPC_URL`)
- Live endpoint `GET /api/complaints/:complaintId/blockchain/live`
- Chain check logic that fetches transaction and receipt before returning verification status

This means complaint verification shown to users is fetched from Sepolia when RPC is configured.

## Prisma Schema Changes

The complaint model now tracks blockchain sync state.

### Added fields in `Complaint`

- `blockchainHash String? @db.VarChar(66)`
- `blockchainBlock BigInt?`
- `ipfsHash String?`
- `isOnChain Boolean @default(false)`
- `blockchainStatus BlockchainStatus @default(PENDING)`
- `blockchainUpdatedAt DateTime?`
- `@@index([blockchainHash])`

### Tested Prisma schema patch (copy-ready)

Use the following structure in the full schema (already integrated in this backend):

```prisma
model Complaint {
  id                             String                    @id @default(uuid())
  submissionDate                 DateTime                  @default(now())
  complainantId                  String?
  subCategory                    String
  description                    String
  urgency                        ComplaintUrgency          @default(LOW)
  attachmentUrl                  String?
  status                         ComplaintStatus           @default(REGISTERED)
  upvoteCount                    Int                       @default(0)
  isPublic                       Boolean
  assignedAgentId                String?
  assignedDepartment             String
  categoryId                     String
  crossDeptIssueSuperMunicipalId String?
  dateOfResolution               DateTime?
  escalatedToStateAdminId        String?
  escalatedToSuperStateAdminId   String?
  escalationLevel                String?
  managedByMunicipalAdminId      String?
  managedBySuperAdminId          String?
  moderatedByMunicipalAdminId    String?
  seq                            Int                       @unique @default(autoincrement())

  // Blockchain sync fields
  blockchainHash                 String?                   @db.VarChar(66)
  blockchainBlock                BigInt?
  ipfsHash                       String?
  isOnChain                      Boolean                   @default(false)
  blockchainStatus               BlockchainStatus          @default(PENDING)
  blockchainUpdatedAt            DateTime?

  sla                            String?
  AIabusedFlag                   Boolean?
  AIimageVarificationStatus      Boolean?
  AIstandardizedSubCategory      String?
  lastUpdated                    DateTime                  @updatedAt
  isDuplicate                    Boolean?
  assignedAgent                  Agent?                    @relation("AssignedAgentComplaints", fields: [assignedAgentId], references: [id])
  category                       Category                  @relation(fields: [categoryId], references: [id])
  User                           User?                     @relation(fields: [complainantId], references: [id])
  crossDeptIssueSuperMunicipal   SuperMunicipalAdmin?      @relation("SuperMunicipalToCrossDeptIssues", fields: [crossDeptIssueSuperMunicipalId], references: [id])
  escalatedToStateAdmin          DepartmentStateAdmin?     @relation("StateAdminToEscalatedComplaints", fields: [escalatedToStateAdminId], references: [id])
  escalatedToSuperStateAdmin     SuperStateAdmin?          @relation("SuperStateToEscalatedComplaints", fields: [escalatedToSuperStateAdminId], references: [id])
  managedByMunicipalAdmin        DepartmentMunicipalAdmin? @relation("MunicipalAdminToComplaints", fields: [managedByMunicipalAdminId], references: [id])
  managedBySuperAdmin            SuperAdmin?               @relation(fields: [managedBySuperAdminId], references: [id])
  moderatedByMunicipalAdmin      DepartmentMunicipalAdmin? @relation("MunicipalAdminModeratedComplaints", fields: [moderatedByMunicipalAdminId], references: [id])
  auditLogs                      AuditLog[]
  chats                          Chat[]
  location                       ComplaintLocation?
  upvotes                        Upvote[]
  coAssignedAgents               Agent[]                   @relation("CoAssignedAgentComplaints")

  @@index([blockchainHash])
}

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

enum BlockchainStatus {
  PENDING
  CONFIRMED
  FAILED
}

enum SyncEventStatus {
  PROCESSED
  DUPLICATE
  FAILED
}
```

### Migration used for testing

After schema update:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name add_blockchain_sync_fields
```

## API Changes

### Internal endpoint (worker to backend)

- `POST /internal/blockchain/sync`
- Protected using `Authorization: Bearer <BACKEND_SYNC_TOKEN>`
- Purpose: upsert blockchain result into complaint record

Expected payload fields:

- `entityType`
- `entityId`
- `keyPrefix`
- `blockchainHash`
- `blockchainBlock` (optional)
- `ipfsHash` (optional)
- `isOnChain`
- `updatedAt` (optional)

### Public endpoints (frontend and verification)

- `GET /api/complaints/:complaintId/blockchain`
  - Database-backed blockchain view
- `GET /api/complaints/:complaintId/blockchain/live`
  - Database + live Sepolia verification
- `GET /api/blockchain/tx/:txHash`
  - Find complaint by tx hash and return live verification

Live response includes:

- `chainVerification.status`
- `chainVerification.verified`
- `chainVerification.message`
- `chainVerification.receipt`
- `chainVerification.toMatchesContract`

## Frontend Integration Pattern

When complaint detail page loads:

1. Call `GET /api/complaints/:complaintId/blockchain/live`.
2. Render blockchain badge using `chainVerification.status`.
3. If pending, poll every 15-30 seconds until final state.
4. Show explorer link using `explorerUrl`.

Optional manual support path:

- Allow a "Verify by tx hash" screen using `GET /api/blockchain/tx/:txHash`.

## Security and Configuration

Required secure configuration:

- `DATABASE_URL`
- `BACKEND_SYNC_TOKEN`
- `BLOCKCHAIN_RPC_URL`
- `BLOCKCHAIN_CONTRACT_ADDRESS`

Notes:

- Internal sync endpoint must never be public without token protection.
- `BLOCKCHAIN_CONTRACT_ADDRESS` should be set to enforce contract-target verification.

## Operational Checklist

1. Contract deployed on Sepolia and address configured.
2. Worker wallet authorized in contract.
3. Worker can access Redis and RPC.
4. Sync backend reachable by worker.
5. Frontend uses live endpoint for complaint status badge.

## Quick Validation (Demo to Leadership)

1. Submit a new complaint in app.
2. Confirm DB shows complaint with pending blockchain status.
3. Wait for worker to process queue.
4. Open complaint details page.
5. Verify badge shows `VERIFIED` and tx hash/explorer link is visible.

This demonstrates real end-to-end blockchain traceability: user action -> queue -> worker -> contract -> sync -> user-visible proof.
