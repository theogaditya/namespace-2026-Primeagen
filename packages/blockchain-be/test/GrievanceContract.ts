import { expect } from "chai";
import { ethers } from "hardhat";
import { GrievanceContractOptimized } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

// Helper: assert a tx reverts with a specific error message.
// Works without hardhat-chai-matchers (which needs chai v4 but workspace has chai v5).
async function expectRevert(promise: Promise<any>, expectedMessage: string) {
  try {
    await promise;
    expect.fail("Expected transaction to revert but it succeeded");
  } catch (error: any) {
    const msg = error?.message || String(error);
    expect(msg).to.include(expectedMessage,
      `Expected revert with "${expectedMessage}" but got: ${msg.slice(0, 200)}`);
  }
}

// Helper: assert a tx does NOT revert.
async function expectNoRevert(promise: Promise<any>) {
  try {
    await promise;
  } catch (error: any) {
    expect.fail(`Expected transaction to succeed but it reverted: ${error?.message || error}`);
  }
}

// Helper: assert a tx emits a given event name.
async function expectEvent(txPromise: Promise<any>, contract: any, eventName: string) {
  const tx = await txPromise;
  const receipt = await tx.wait();
  const iface = contract.interface;
  const eventFragment = iface.getEvent(eventName);
  expect(eventFragment, `Event ${eventName} not found in ABI`).to.not.be.null;
  const topicHash = iface.getEvent(eventName)!.topicHash;
  const found = receipt.logs.some((log: any) => log.topics[0] === topicHash);
  expect(found, `Expected event "${eventName}" to be emitted`).to.be.true;
}

describe("GrievanceContractOptimized", function () {
  let contract: GrievanceContractOptimized;
  let owner: HardhatEthersSigner;
  let citizen: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, citizen] = await ethers.getSigners();
    
    const GrievanceContractOptimized = await ethers.getContractFactory("GrievanceContractOptimized");
    contract = await GrievanceContractOptimized.deploy();
    await contract.waitForDeployment();
  });

  describe("Register Complaint", function () {
    it("Should register a new complaint with location data", async function () {
      const complaintId = "COMP-001";
      const complainantId = citizen.address;
      const categoryId = "PWD";
      const subCategory = "Road Repair";
      const department = "DEPT-PWD";
      const urgency = 2; // MEDIUM (valid: 1, 2, 3, 4)
      const descHash = ethers.id("complaint description");
      const attachHash = ethers.id("attachment");
      const locationHash = ethers.id("lat,lng");
      const pin = "560001";
      const district = "Bangalore";
      const city = "Bangalore";
      const locality = "Indiranagar";
      const state = "Karnataka";

      await contract.registerComplaint(
        complaintId,
        complainantId,
        categoryId,
        subCategory,
        department,
        urgency,
        descHash,
        attachHash,
        locationHash,
        true,
        pin,
        district,
        city,
        locality,
        state
      );

      const complaint = await contract.getComplaint(complaintId);
      // ethers v6 returns Solidity uint as BigInt — compare with BigInt literals
      expect(complaint.urgencyLevel).to.equal(BigInt(urgency)); // 2n
      expect(complaint.statusCode).to.equal(1n); // REGISTERED
      expect(complaint.isPublic).to.be.true;
    });

    it("Should not allow duplicate complaint IDs", async function () {
      const complaintId = "COMP-002";
      const baseParams = [
        complaintId,
        citizen.address,
        "CAT1",
        "SubCat1",
        "DEPT1",
        1, // urgency between 1-4
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "123456",
        "District",
        "City",
        "Locality",
        "State"
      ] as const;

      await contract.registerComplaint(...baseParams);

      await expectRevert(
        contract.registerComplaint(...baseParams),
        "Complaint already exists"
      );
    });

    it("Should reject invalid urgency levels", async function () {
      const complaintId = "COMP-003";
      
      await expectRevert(
        contract.registerComplaint(
          complaintId,
          citizen.address,
          "PWD",
          "Pothole",
          "DEPT-PWD",
          0, // Invalid urgency (must be 1-4)
          ethers.id("desc"),
          ethers.id("attach"),
          ethers.id("loc"),
          true,
          "560001",
          "Bangalore",
          "Bangalore",
          "MG Road",
          "Karnataka"
        ),
        "Invalid urgency"
      );
    });
  });

  describe("Anonymous Complaints", function () {
    it("Should register anonymous complaint", async function () {
      const complaintId = "ANON-001";
      const identityCommitment = ethers.id("secret-identity");

      await contract.registerAnonymousComplaint(
        complaintId,
        identityCommitment,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        2,
        ethers.id("description"),
        ethers.id("attachment"),
        ethers.id("location"),
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );

      const complaint = await contract.getComplaint(complaintId);
      expect(complaint.urgencyLevel).to.equal(2n);
      expect(complaint.statusCode).to.equal(1n); // REGISTERED
      expect(complaint.isPublic).to.be.false;
    });

    it("Should not allow duplicate anonymous complaint IDs", async function () {
      const complaintId = "ANON-002";
      const identityCommitment = ethers.id("secret-identity");

      await contract.registerAnonymousComplaint(
        complaintId,
        identityCommitment,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        1,
        ethers.id("description"),
        ethers.id("attachment"),
        ethers.id("location"),
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );

      await expectRevert(
        contract.registerAnonymousComplaint(
          complaintId,
          identityCommitment,
          "PWD",
          "Pothole",
          "DEPT-PWD",
          1,
          ethers.id("description"),
          ethers.id("attachment"),
          ethers.id("location"),
          "560001",
          "Bangalore",
          "Bangalore",
          "MG Road",
          "Karnataka"
        ),
        "Complaint already exists"
      );
    });

    it("Should require anonymous proof verification when verifier is configured", async function () {
      const complaintId = "ANON-003";
      const identityCommitment = ethers.id("secret-identity-verified");
      const MockVerifier = await ethers.getContractFactory("MockAnonymousProofVerifier");
      const verifier = await MockVerifier.deploy();
      await verifier.waitForDeployment();

      await contract.setAnonymousProofVerifier(await verifier.getAddress());

      await expectRevert(
        contract.registerAnonymousComplaint(
          complaintId,
          identityCommitment,
          "PWD",
          "Pothole",
          "DEPT-PWD",
          2,
          ethers.id("description"),
          ethers.id("attachment"),
          ethers.id("location"),
          "560001",
          "Bangalore",
          "Bangalore",
          "MG Road",
          "Karnataka"
        ),
        "Anonymous proof not verified"
      );

      await expectNoRevert(
        contract.verifyAnonymousIdentityProof(identityCommitment, "0x1234")
      );

      await expectNoRevert(
        contract.registerAnonymousComplaint(
          complaintId,
          identityCommitment,
          "PWD",
          "Pothole",
          "DEPT-PWD",
          2,
          ethers.id("description"),
          ethers.id("attachment"),
          ethers.id("location"),
          "560001",
          "Bangalore",
          "Bangalore",
          "MG Road",
          "Karnataka"
        )
      );
    });

    it("Should reject invalid anonymous proof when verifier returns false", async function () {
      const identityCommitment = ethers.id("secret-identity-invalid-proof");
      const MockVerifier = await ethers.getContractFactory("MockAnonymousProofVerifier");
      const verifier = await MockVerifier.deploy();
      await verifier.waitForDeployment();

      await contract.setAnonymousProofVerifier(await verifier.getAddress());
      await verifier.setShouldVerify(false);

      await expectRevert(
        contract.verifyAnonymousIdentityProof(identityCommitment, "0x1234"),
        "Invalid anonymous proof"
      );
    });
  });

  describe("Assign Complaint", function () {
    beforeEach(async function () {
      await contract.registerComplaint(
        "COMP-005",
        citizen.address,
        "EDU",
        "School Infrastructure",
        "DEPT-EDU",
        2,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "Yeshwantpur",
        "Karnataka"
      );
    });

    it("Should assign complaint to department", async function () {
      const departmentId = "DEPT-PWD-001";
      
      await contract.assignComplaint("COMP-005", departmentId);
      
      const complaint = await contract.getComplaint("COMP-005");
      expect(complaint.statusCode).to.equal(2n); // PROCESSING
    });

    it("Should emit ComplaintAssigned event", async function () {
      await expectEvent(
        contract.assignComplaint("COMP-005", "DEPT-HEALTH"),
        contract,
        "ComplaintAssigned"
      );
    });

    it("Should revert for non-existent complaint", async function () {
      await expectRevert(
        contract.assignComplaint("COMP-NONEXISTENT", "DEPT-PWD"),
        "Complaint does not exist"
      );
    });
  });

  describe("Resolve Complaint", function () {
    beforeEach(async function () {
      await contract.registerComplaint(
        "COMP-006",
        citizen.address,
        "TRN",
        "Bus Service",
        "DEPT-TRN",
        3,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "Whitefield",
        "Karnataka"
      );
      
      // First assign it to move status from 1 (REGISTERED) to 2 (PROCESSING)
      await contract.assignComplaint("COMP-006", "DEPT-TRN");
    });

    it("Should resolve complaint", async function () {
      await contract.resolveComplaint("COMP-006");
      
      const complaint = await contract.getComplaint("COMP-006");
      expect(complaint.statusCode).to.equal(5n); // COMPLETED
    });

    it("Should emit ComplaintResolved event", async function () {
      await expectEvent(
        contract.resolveComplaint("COMP-006"),
        contract,
        "ComplaintResolved"
      );
    });

    it("Should revert for non-existent complaint", async function () {
      await expectRevert(
        contract.resolveComplaint("COMP-NONEXISTENT"),
        "Complaint does not exist"
      );
    });
  });

  describe("SLA & Escalation", function () {
    it("Should record complaint SLA", async function () {
      const complaintId = "COMP-SLA-001";
      
      await contract.registerComplaint(
        complaintId,
        citizen.address,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        1,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );

      const dueTimestamp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      await contract.recordComplaintSla(complaintId, dueTimestamp, "7-day SLA");

      const complaint = await contract.getComplaint(complaintId);
      expect(complaint.statusCode).to.equal(1n); // Status unchanged
    });

    it("Should escalate complaint with new status", async function () {
      const complaintId = "COMP-ESC-001";
      
      await contract.registerComplaint(
        complaintId,
        citizen.address,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        2,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );

      // Status 7 = ESCALATED
      await contract.escalateComplaint(complaintId, 7, "SLA breach");

      const complaint = await contract.getComplaint(complaintId);
      expect(complaint.statusCode).to.equal(7n);
    });

    it("Should mark SLA as breached", async function () {
      const complaintId = "COMP-SLA-BREACH";
      
      await contract.registerComplaint(
        complaintId,
        citizen.address,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        2,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );

      const pastTime = Math.floor(Date.now() / 1000) - 1;
      await contract.recordComplaintSla(complaintId, pastTime, "already overdue");
      
      await contract.markComplaintSlaBreached(complaintId, "Breach confirmed");
      
      const sla = await contract.getComplaintSla(complaintId);
      expect(sla.breached).to.be.true;
    });
  });

  describe("Upvotes & Integrity", function () {
    it("Should record upvote on complaint", async function () {
      const complaintId = "COMP-UPVOTE-001";
      
      await contract.registerComplaint(
        complaintId,
        citizen.address,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        2,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );

      await contract.upvoteComplaint(complaintId);

      const complaint = await contract.getComplaint(complaintId);
      expect(complaint.upvoteCount).to.equal(1n);
    });

    it("Should prevent duplicate upvotes from same address", async function () {
      const complaintId = "COMP-UPVOTE-002";
      
      await contract.registerComplaint(
        complaintId,
        citizen.address,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        1,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );

      await contract.upvoteComplaint(complaintId);

      await expectRevert(
        contract.upvoteComplaint(complaintId),
        "Already upvoted"
      );
    });

    it("Should track upvote count correctly", async function () {
      const complaintId = "COMP-UPVOTE-003";
      const [owner, addr1, addr2] = await ethers.getSigners();
      
      await contract.registerComplaint(
        complaintId,
        owner.address,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        2,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );

      await contract.upvoteComplaint(complaintId);
      await contract.connect(addr1).upvoteComplaint(complaintId);
      await contract.connect(addr2).upvoteComplaint(complaintId);

      const complaint = await contract.getComplaint(complaintId);
      expect(complaint.upvoteCount).to.equal(3n);
    });
  });

  describe("Duplicate Assessment & Agent Performance", function () {
    it("Should record duplicate assessment with merkle proof", async function () {
      const complaintId = "COMP-DUP-001";
      
      await contract.registerComplaint(
        complaintId,
        citizen.address,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        1,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );

      const leafHash = ethers.id("complaint-leaf");
      // Simple merkle root (for testing: just the leaf hash itself)
      const merkleRoot = leafHash;
      const proof: string[] = [];

      await contract.recordDuplicateAssessment(
        complaintId,
        leafHash,
        merkleRoot,
        proof,
        true
      );

      const complaint = await contract.getComplaint(complaintId);
      expect(complaint.statusCode).to.equal(1n); // Status unchanged
    });

    it("Should record agent performance on complaint", async function () {
      const complaintId = "COMP-AGENT-001";
      const agentId = "AGENT-001";
      
      await contract.registerComplaint(
        complaintId,
        citizen.address,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        2,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );

      // Record agent performance when complaint is COMPLETED (statusCode 5)
      // First resolve the complaint
      await contract.assignComplaint(complaintId, "DEPT-PWD");
      await contract.resolveComplaint(complaintId);
      
      // Now record performance with outcome status 5 (COMPLETED)
      await contract.recordAgentPerformance(agentId, complaintId, 5, 10);

      const complaint = await contract.getComplaint(complaintId);
      expect(complaint.statusCode).to.equal(5n); // COMPLETED
    });
  });

  describe("Query Functions", function () {
    it("Should get complaint count", async function () {
      await contract.registerComplaint(
        "C1",
        citizen.address,
        "CAT1",
        "Sub1",
        "DEPT1",
        1,
        ethers.id("h1"),
        ethers.id("h2"),
        ethers.id("loc1"),
        true,
        "123456",
        "D1",
        "C1",
        "L1",
        "S1"
      );
      
      await contract.registerComplaint(
        "C2",
        citizen.address,
        "CAT2",
        "Sub2",
        "DEPT2",
        2,
        ethers.id("h3"),
        ethers.id("h4"),
        ethers.id("loc2"),
        true,
        "654321",
        "D2",
        "C2",
        "L2",
        "S2"
      );
      
      const count = await contract.totalComplaints();
      expect(count).to.equal(2n);
    });

    it("Should verify complaint hash", async function () {
      const descHash = ethers.id("unique-complaint-description");
      
      await contract.registerComplaint(
        "C-HASH",
        citizen.address,
        "CAT",
        "Sub",
        "DEPT",
        3,
        descHash,
        ethers.id("h2"),
        ethers.id("loc"),
        true,
        "123456",
        "D",
        "C",
        "L",
        "S"
      );
      
      const isValid = await contract.verifyHash("C-HASH", descHash);
      expect(isValid).to.be.true;
    });

    it("Should get complaint status history", async function () {
      const complaintId = "COMP-HISTORY";
      
      await contract.registerComplaint(
        complaintId,
        citizen.address,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        1,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );
      
      // Now assign and escalate to create history
      await contract.assignComplaint(complaintId, "DEPT-PWD");
      await contract.escalateComplaint(complaintId, 7, "urgent");
      
      const history = await contract.getComplaintStatusHistory(complaintId);
      expect(history.length).to.be.greaterThan(0);
    });

    it("Should get complaint escalation history", async function () {
      const complaintId = "COMP-ESC-HISTORY";
      
      await contract.registerComplaint(
        complaintId,
        citizen.address,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        1,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );
      
      await contract.escalateComplaint(complaintId, 7, "urgent");
      await contract.escalateComplaint(complaintId, 8, "critical");
      
      const escalations = await contract.getComplaintEscalationHistory(complaintId);
      expect(escalations.length).to.equal(2);
    });
  });

  describe("User Management", function () {
    it("Should register a user", async function () {
      const userId = "USER-001";
      const name = "John Doe";
      const role = "citizen";
      
      await contract.registerUser(
        userId,
        name,
        role,
        ethers.id("email@example.com"),
        ethers.id("aadhaar-123"),
        ethers.id("location-hash"),
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );

      const user = await contract.getUser(userId);
      expect(user.isActive).to.be.true;
    });

    it("Should not allow duplicate user registration", async function () {
      const userId = "USER-002";
      const params = [
        userId,
        "John Doe",
        "citizen",
        ethers.id("email@example.com"),
        ethers.id("aadhaar-123"),
        ethers.id("location-hash"),
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      ] as const;

      await contract.registerUser(...params);

      await expectRevert(
        contract.registerUser(...params),
        "User already exists"
      );
    });
  });

  describe("Authorization Controls", function () {
    it("Should block non-authorized operator for sensitive actions", async function () {
      const complaintId = "COMP-AUTH-001";

      await contract.registerComplaint(
        complaintId,
        owner.address,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        2,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );

      await expectRevert(
        contract.connect(citizen).recordComplaintSla(complaintId, Math.floor(Date.now() / 1000) + 3600, "SLA"),
        "Not authorized operator"
      );
    });

    it("Should allow owner to authorize another operator", async function () {
      const complaintId = "COMP-AUTH-002";

      await contract.registerComplaint(
        complaintId,
        owner.address,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        2,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );

      await contract.setAuthorizedOperator(citizen.address, true);

      await expectNoRevert(
        contract.connect(citizen).recordComplaintSla(complaintId, Math.floor(Date.now() / 1000) + 3600, "SLA")
      );
    });
  });

  describe("Verification and Certificates", function () {
    it("Should emit complaint verification code event", async function () {
      const complaintId = "COMP-VER-001";

      await contract.registerComplaint(
        complaintId,
        owner.address,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        2,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );

      await expectEvent(
        contract.emitComplaintVerificationCode(complaintId),
        contract,
        "ComplaintVerificationCodeCreated"
      );
    });

    it("Should mint and expose resolution certificate token record", async function () {
      const complaintId = "COMP-CERT-001";

      await contract.registerComplaint(
        complaintId,
        owner.address,
        "PWD",
        "Pothole",
        "DEPT-PWD",
        2,
        ethers.id("desc"),
        ethers.id("attach"),
        ethers.id("loc"),
        true,
        "560001",
        "Bangalore",
        "Bangalore",
        "MG Road",
        "Karnataka"
      );

      await contract.assignComplaint(complaintId, "DEPT-PWD");
      await contract.resolveComplaint(complaintId);

      await contract.issueResolutionCertificateToWallet(
        complaintId,
        "USER-123",
        citizen.address,
        "ipfs://certificate-metadata"
      );

      const tokenId = await contract.getResolutionCertificateTokenByComplaint(complaintId);
      expect(tokenId).to.equal(1n); // ethers v6: BigInt

      const cert = await contract.getResolutionCertificate(tokenId);
      expect(cert.recipientWallet).to.equal(citizen.address);
      expect(cert.tokenUri).to.equal("ipfs://certificate-metadata");
    });
  });
});
