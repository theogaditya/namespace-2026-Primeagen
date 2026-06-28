# Swaraj Blockchain Worker

A production-oriented blockchain worker for civic grievance workflows.

This service reads grievance and user events from Redis queues, uploads metadata to IPFS (Pinata), writes immutable records to Ethereum (Sepolia), and syncs blockchain metadata back to Redis and optional backend APIs.

## What You Built

This repository now includes a complete end-to-end blockchain processing layer with reliability and governance features:

- Queue-driven worker for user registration and complaint processing.
- IPFS metadata upload and CID persistence.
- On-chain complaint and user registration via Solidity contract.
- On-chain status audit trail (who changed status, when, and why hash).
- SLA recording and SLA breach events.
- Escalation trail with from/to status and reason hash.
- Duplicate assessment recording using Merkle proof verification.
- Agent performance recording on-chain.
- Upvote integrity flow.
- Verification code generation and optional on-chain verification-code event emission.
- Resolution certificate issuance, including wallet-bound token metadata records.
- Optional anonymous proof verification gate for anonymous complaints.
- Authorization model (owner + authorized operators) for sensitive contract actions.
- Retry + DLQ + processing-queue recovery for resilient queue handling.
- Terraform-managed AWS ECS deployment with Secrets Manager secret injection.

## System Flow

1. App services push payloads to Redis queues.
2. Worker atomically claims queue messages into processing queues.
3. Worker uploads JSON metadata to Pinata and gets CID.
4. Worker writes transaction(s) to contract on Sepolia.
5. Worker stores tx hash, block number, CID, and sync metadata in Redis.
6. Worker optionally POSTs metadata to backend sync endpoint.
7. On failure, worker retries with exponential backoff and jitter.
8. Exhausted messages are moved to DLQ.

## Smart Contract Highlights

Main contract: contracts/GrievanceContract.sol
Contract name: GrievanceContractOptimized

Important capabilities:

- Owner and authorized operator controls.
- User registration and complaint registration.
- Anonymous complaint registration with optional proof verifier.
- Status update with reason and status audit history.
- SLA record and breach mark.
- Escalation record tracking.
- Duplicate assessment record (Merkle proof-based).
- Agent performance record.
- Civic priority create/vote.
- Resolution certificate issue and wallet-linked certificate record.
- Complaint verification code retrieval and event emission.

Mock contract for tests: contracts/MockAnonymousProofVerifier.sol

## Worker Queues

Default queues:

- user:registration:queue
- complaint:blockchain:queue
- blockchain:metadata:queue

Automatically managed queues:

- user:registration:queue:processing
- complaint:blockchain:queue:processing
- user:registration:queue:dlq
- complaint:blockchain:queue:dlq

## Project Structure

- contracts/: Solidity contracts
- src/worker.ts: Core queue/IPFS/chain worker
- src/server.ts: Health server + worker bootstrap
- test/: Hardhat contract tests
- terraform/: AWS infrastructure (ECR, ECS, VPC, IAM, logs)
- doc/: deployment and setup docs

## Local Setup

Prerequisites:

- Node.js 18+ (or Bun)
- Redis
- Sepolia RPC URL
- Funded private key
- Pinata JWT

Install and run:

```bash
npm install
cp .env.example .env
npm run compile
npm test
npm run worker
```

Or run server + worker together:

```bash
npm run build
node dist/server.js
```

Health endpoints:

- GET /
- GET /health

## Environment Variables

Core runtime variables:

- BLOCKCHAIN_RPC_URL
- PRIVATE_KEY
- CONTRACT_ADDRESS
- REDIS_URL
- PINATA_JWT

Queue and retry controls:

- USER_QUEUE_NAME
- COMPLAINT_QUEUE_NAME
- METADATA_SYNC_QUEUE
- WORKER_POLL_INTERVAL
- MAX_RETRIES
- MAX_TX_RETRIES
- BASE_RETRY_DELAY_MS
- MAX_RETRY_DELAY_MS

Optional integration:

- BACKEND_SYNC_URL
- BACKEND_SYNC_TOKEN
- EMIT_VERIFICATION_CODE_TX
- QUEUE_NAME (legacy fallback)

Optional Redis fallback (used only if REDIS_URL is not set):

- REDIS_HOST
- REDIS_PORT
- REDIS_PASSWORD

## AWS Deployment (Terraform + ECS)

Use Secrets Manager for all sensitive values.
Do not pass plaintext secrets in Terraform vars or task environment.

High-level steps:

1. Create/update secrets in AWS Secrets Manager:
   - blockchain/rpc-url
   - blockchain/private-key
   - blockchain/redis-url
   - blockchain/pinata-api-key
   - blockchain/pinata-api-secret
   - blockchain/pinata-jwt
   - blockchain/backend-sync-token (optional)
2. Put secret ARNs in terraform/terraform.tfvars.
3. Provision infra:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

4. Build and push image to ECR:

```bash
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <ECR_URL>
docker build -t blockchain-worker .
docker tag blockchain-worker:latest <ECR_URL>:latest
docker push <ECR_URL>:latest
```

5. Refresh ECS service:

```bash
aws ecs update-service --cluster blockchain-worker-cluster --service blockchain-worker-service --force-new-deployment --region ap-south-1
```

6. Monitor logs:

```bash
aws logs tail /ecs/blockchain-worker --follow --region ap-south-1
```

## Operations Checklist

Before production traffic:

- Ensure worker wallet has Sepolia ETH.
- Ensure contract address is correct for target network.
- Call setAuthorizedOperator(workerWallet, true) from owner wallet.
- Verify DLQ is empty or actively monitored.
- Verify metadata sync endpoint (if used).

## Security Notes

- Never commit .env or terraform.tfvars with raw secret values.
- Rotate keys immediately if exposed in chat, logs, commits, or screenshots.
- Keep private key and Pinata credentials only in Secrets Manager for deployed environments.

## Testing

Run full suite:

```bash
npm test
```

Current suite validates core and advanced flows, including:

- Anonymous proof verification behavior
- Authorization controls
- Verification-code event emission
- Resolution certificate token record exposure

## Related Docs

- BLOCKCHAIN_FEATURES.md
- doc/BLOCKCHAIN_SYNC_LEADER_README.md
- doc/QUICK_START.md
- doc/aws-deployment-guide.md
- doc/DEPLOYMENT_SUMMARY.md

## License

ISC
