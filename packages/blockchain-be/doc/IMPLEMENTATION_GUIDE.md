# SwarajDesk Blockchain Feature Implementation Guide

This guide details how to implement the requested premium features using the **existing** `GrievanceContractOptimized` codebase. This will form the core of your Google Solution Challenge submission.

---

## Feature 1: Live On-Chain Complaint Status Tracking
**Goal**: Make the complaint timeline trustless and verifiable by storing and fetching status updates directly from the blockchain (instead of just the DB).

### How it works with your codebase:
Your current smart contract *already* has the foundation for this! 

1. **Writing to Chain**: 
   When a complaint's status changes in your backend, you are calling `updateComplaintStatusWithReason` in `GrievanceContract.sol` (Lines 672-718).
   This already performs the following:
   - Updates the main `complaints` mapping.
   - Pushes an audit entry to `complaintStatusHistory` via `_appendStatusHistory`.
   - Emits a `ComplaintStatusAudited` event.

2. **Fetching from Chain**:
   To make it live on the frontend, you don't need new contract code. You need to implement the fetch layer.
   - **Method A (Live listener)**: In your frontend or a websocket backend, listen to the `ComplaintStatusAudited(string indexed complaintId, uint8 oldStatus, uint8 newStatus, address indexed changedBy, bytes32 reasonHash, uint256 timestamp)` event. Push this directly to the user's screen.
   - **Method B (On-Demand Fetch)**: When a citizen opens the tracking page, call the existing `getComplaintStatusHistory(string calldata _complaintId)` (Line 1193) function from your frontend using `ethers.js` or `viem`.
   
### What you need to change:
- **Backend (Node/Bun)**: Ensure the `complaint:blockchain:queue` correctly maps the status updates to `GrievanceContract.updateComplaintStatusWithReason()`.
- **Frontend**: Instead of hitting `/api/complaints/:id/history`, initialize `ethers.Contract` and call `getComplaintStatusHistory(complaintId)`. Map the returned `StatusAuditEntry[]` tuples to your UI timeline.

---

## Feature 2: Verifiable Citizen Report NFTs (Soulbound Tokens)
**Goal**: When a complaint is resolved, mint a Soulbound (non-transferable) NFT directly to the citizen's wallet as cryptographic proof of their civic participation.

### How it works with your codebase:
Your contract currently has `issueResolutionCertificateToWallet` (Line 984). This behaves like a precursor to an NFT but is not a standard ERC-721 token yet.

### What you need to change:

**1. Modify the Smart Contract (`GrievanceContract.sol`):**
First, run `npm install @openzeppelin/contracts` in `packages/blockchain-be`.

Import OpenZeppelin at the top and update your contract definition:
```solidity
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

// Inherit ERC721
contract GrievanceContractOptimized is ERC721URIStorage { 
    // ... Add ERC721 to your constructor ...
    constructor() ERC721("SwarajDesk Resolution", "SDR") {
        // existing constructor code ...
    }
```

Update your `_issueResolutionCertificate` function to mint the token:
```solidity
// Mint the token inside _issueResolutionCertificate
_safeMint(_recipientWallet, tokenId);
_setTokenURI(tokenId, _tokenUri);
```

Make it **Soulbound** by preventing transfers:
```solidity
// Add this function anywhere in your contract to prevent transfers
function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal override {
    require(from == address(0), "Err: Token is Soulbound and cannot be transferred!");
    super._beforeTokenTransfer(from, to, tokenId, batchSize);
}
```

**2. Modify the Blockchain Worker (`src/worker.ts`):**
In `worker.ts`, update `issueResolutionCertificate()` to build token metadata and upload it to Pinata before minting.

```typescript
private async issueResolutionCertificate(id: string, data: ComplaintQueueData) {
    const recipientWallet = data.resolutionRecipientWallet;
    
    // 1. Create Soulbound NFT Metadata
    const nftMetadata = {
        name: `SwarajDesk Resolution: ${id}`,
        description: `Official Soulbound Verification that Complaint ${id} was resolved.`,
        image: "ipfs://YOUR_LOGO_CID_HERE", 
        attributes: [
            { trait_type: "Category", value: data.categoryId },
            { trait_type: "Resolution Date", value: new Date().toISOString() }
        ]
    };

    // 2. Upload to Pinata
    const tokenUri = `ipfs://${await this.uploadToPinata(nftMetadata)}`;

    // 3. Mint the Token 
    const receipt = await this.sendTransactionWithRetry("issueResolutionCertificate", async () => {
      if (recipientWallet && ethers.isAddress(recipientWallet)) {
        const fn = this.contract.getFunction("issueResolutionCertificateToWallet");
        return fn(id, data.resolutionRecipientId, recipientWallet, tokenUri);
      }
      // fallback...
    });
}
```

**3. Trigger the Mint (Backend):**
When a complaint is completed and pushed to your Redis queue, simply include the citizen's wallet address:
```json
{
  "id": "COMP-123",
  "issueResolutionCertificate": true,
  "resolutionRecipientWallet": "0xUserWalletAddressHere"
}
```

---

## ⭐ Suggested Feature for Google Solution Challenge: "Civic Truth Protocol"

Since you want a feature that will **WOW** the Google Solution Challenge judges, I highly recommend building the **Civic Truth Protocol**. It is the most impressive, technically sound, and socially innovative feature possible using your current tech stack.

### What is it?
Right now, if an agent marks a pothole as `COMPLETED`, the system trusts them. The Civic Truth Protocol introduces **decentralized ground-truth verification**.

1. Agent marks complaint `COMPLETED`.
2. The system triggers a mobile notification to the 3 closest verified citizens (using your existing mapping/location data).
3. These citizens go to the physical location and take a photo. You pass this photo through your existing **Vision AI** to verify if the issue is actually resolved.
4. If the citizens & AI verify it, the resolution is finalized on-chain and the citizens earn small token rewards.
5. If they dispute it, the `AgentPerformance` (Line 909) score is slashed, and the complaint is auto-escalated using your `escalateComplaint` function.

### Why Judges will love this:
- **Combines all your technologies**: Uses your AI image matcher, your 6-tier RBAC, your precise geolocation data, and your blockchain smart contracts.
- **Solves a real problem**: Tackles systemic corruption where government workers mark jobs as "done" without doing them.
- **High impact**: It creates a trustless, citizen-led accountability network. 

You already have `recordAgentPerformance` and complaint location hashing in your smart contract—this feature just ties them together into a beautiful, jaw-dropping demo.
