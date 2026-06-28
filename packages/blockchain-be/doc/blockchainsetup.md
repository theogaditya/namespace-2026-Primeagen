# Blockchain Backend Setup Guide

Hey! This guide will walk you through setting up the blockchain backend for the Swaraj Grievance System. Don't worry if you're new to this - we'll go step by step.

---

## What Does This Do?

This backend does a few cool things:
- Stores user registrations and complaints on the blockchain (so no one can tamper with them)
- Listens to Redis queues and processes tasks automatically
- Creates audit logs that can't be deleted or modified

---

## Before You Start

Make sure you have these installed on your computer:

- **Node.js** (version 18 or higher) - Check with: `node --version`
- **npm** (comes with Node.js) - Check with: `npm --version`
- **Redis** (the database for queues) - Check with: `redis-cli ping` (should return PONG)

If you don't have Redis, you can quickly run it with Docker:
```bash
docker run -d -p 6379:6379 redis
```

---

## Step 1: Install Everything

First, go to the blockchain-be folder:

```bash
cd packages/blockchain-be
```

Then install all the packages:

```bash
npm install
```

Wait for it to finish. You'll see a bunch of packages getting installed.

---

## Step 2: Set Up Your Environment File

Create a file called `.env` in the blockchain-be folder. You can do this:

```bash
touch .env
```

Now open it and paste this:

```env
# Blockchain stuff
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CONTRACT_ADDRESS=

# Redis stuff
REDIS_URL=redis://localhost:6379

# Worker settings
WORKER_POLL_INTERVAL=5000
```

**Quick explanation:**
- `BLOCKCHAIN_RPC_URL` - Where the blockchain node is running
- `PRIVATE_KEY` - The wallet key that signs transactions (the one above is a test key from Hardhat, don't use it for real money!)
- `CONTRACT_ADDRESS` - We'll fill this after deploying
- `REDIS_URL` - Where Redis is running
- `WORKER_POLL_INTERVAL` - How often to check for new tasks (5000 = 5 seconds)

---

## Step 3: Compile the Smart Contract

Run this to compile the Solidity code:

```bash
npm run compile
```

You should see something like:
```
Compiled 1 Solidity file successfully
```

---

## Step 4: Start a Local Blockchain

Open a **new terminal window** (keep the first one open) and run:

```bash
npm run node
```

This starts a fake blockchain on your computer for testing. You'll see a bunch of accounts with fake ETH.

**Don't close this terminal!** Keep it running.

---

## Step 5: Deploy the Contract

Go back to your first terminal and run:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

You'll see something like:
```
Deploying GrievanceContract...
GrievanceContract deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

**Copy that address!** (yours will be different)

Now open your `.env` file and paste it:

```env
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
```

---

## Step 6: Start the Worker

Now run the worker that processes blockchain tasks:

```bash
npm run worker
```

If everything is good, you'll see:

```
🔗 ===========================================
🔗 BLOCKCHAIN WORKER INITIALIZED
🔗 ===========================================
   🌐 RPC: http://127.0.0.1:8545
   📜 Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
   👥 User Queue: user:registration:queue
   📝 Complaint Queue: complaint:registration:queue
==========================================

🚀 Worker started. Listening for tasks on both queues...
```

The worker is now listening! When a user signs up or files a complaint, it'll automatically write it to the blockchain.

---

## All the Commands You Can Run

| Command | What it does |
|---------|--------------|
| `npm run compile` | Compiles the smart contract |
| `npm run node` | Starts local blockchain |
| `npm run deploy` | Deploys the contract |
| `npm run worker` | Starts the worker |
| `npm run test` | Runs tests |
| `npm run queue` | Test adding tasks to queue |

---

## How It All Works Together

Here's the simple flow:

```
User signs up or files complaint
         ↓
Backend pushes task to Redis queue
         ↓
Worker picks up the task
         ↓
Worker writes to blockchain
         ↓
Done! Data is now permanent and tamper-proof
```

The queues used:
- `user:registration:queue` - For new users
- `complaint:registration:queue` - For new complaints

If something fails, it retries 3 times. After that, it goes to a "dead letter queue" so you can check what went wrong.

---

## Testing It Out

Want to test if it's working? Open another terminal and try this:

```bash
redis-cli
```

Then add a fake user to the queue:

```bash
RPUSH user:registration:queue '{"id":"TEST-001","email":"test@test.com","name":"Test User","aadhaarId":"123456789012","dateOfCreation":"2024-01-01","location":{"pin":"110001","district":"Central Delhi","city":"New Delhi","municipal":"NDMC","state":"Delhi"}}'
```

Go back to your worker terminal - you should see it processing the user!

---

## Common Problems and Fixes

### "Cannot connect to Redis"
Redis isn't running. Start it:
```bash
# If installed locally
sudo systemctl start redis

# Or with Docker
docker run -d -p 6379:6379 redis
```

### "Contract not deployed" or "invalid address"
You forgot to add the contract address to `.env`. Deploy again and copy the address.

### "Insufficient funds"
Your wallet is empty. If using local Hardhat node, this shouldn't happen. Make sure you're using `--network localhost`.

### "User already exists"
That user is already on the blockchain. Each user can only register once (that's the point!).

### Worker isn't picking up tasks
1. Check if Redis is running
2. Make sure CONTRACT_ADDRESS is set in .env
3. Restart the worker

---

## Deploying to a Real Network (Sepolia Testnet)

If you want to test on a real (test) network:

1. Get a free account at [Infura](https://infura.io/) or [Alchemy](https://www.alchemy.com/)
2. Get your Sepolia RPC URL
3. Get some free Sepolia ETH from a faucet (Google "Sepolia faucet")
4. Update your `.env`:

```env
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=your_real_wallet_private_key
```

5. Deploy:
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

**Warning:** Never share your private key or commit it to git!

---

## Need Help?

If you're stuck:
1. Check the error message carefully
2. Make sure all terminals are running (Hardhat node, Redis, Worker)
3. Double-check your `.env` file
4. Try restarting everything

---

That's it! You're all set up. The blockchain backend will now automatically process any users or complaints that come through the system.
