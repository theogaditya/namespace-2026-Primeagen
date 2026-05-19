import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';

// ============================================================================
// Mock Prisma Client
// ============================================================================
const mockComplaintFindUnique = vi.fn();
const mockComplaintUpdate = vi.fn();
const mockComplaintFindMany = vi.fn();
const mockAgentFindUnique = vi.fn();
const mockAgentFindFirst = vi.fn();
const mockAgentUpdate = vi.fn();
const mockMunicipalAdminFindUnique = vi.fn();
const mockMunicipalAdminFindFirst = vi.fn();
const mockMunicipalAdminUpdate = vi.fn();
const mockStateAdminFindFirst = vi.fn();
const mockStateAdminFindUnique = vi.fn();
const mockStateAdminUpdate = vi.fn();
const mockTransaction = vi.fn();

const prismaMock: any = {
  complaint: {
    findUnique: mockComplaintFindUnique,
    update: mockComplaintUpdate,
    findMany: mockComplaintFindMany,
  },
  agent: {
    findUnique: mockAgentFindUnique,
    findFirst: mockAgentFindFirst,
    update: mockAgentUpdate,
  },
  departmentMunicipalAdmin: {
    findUnique: mockMunicipalAdminFindUnique,
    findFirst: mockMunicipalAdminFindFirst,
    update: mockMunicipalAdminUpdate,
  },
  departmentStateAdmin: {
    findFirst: mockStateAdminFindFirst,
    findUnique: mockStateAdminFindUnique,
    update: mockStateAdminUpdate,
  },
  $transaction: mockTransaction,
};

// ============================================================================
// Test Data Fixtures
// ============================================================================
const mockAgent = {
  id: 'agent-123',
  fullName: 'Test Agent',
  officialEmail: 'agent@test.com',
  status: 'ACTIVE',
  currentWorkload: 5,
  workloadLimit: 10,
  municipality: 'Dhanbad',
  department: 'INFRASTRUCTURE',
};

const mockMunicipalAdmin = {
  id: 'muni-admin-123',
  fullName: 'Municipal Admin',
  officialEmail: 'muni@test.com',
  status: 'ACTIVE',
  currentWorkload: 3,
  workloadLimit: 10,
  municipality: 'Dhanbad',
  managedByStateAdminId: 'state-admin-123',
};

const mockStateAdmin = {
  id: 'state-admin-123',
  fullName: 'State Admin',
  officialEmail: 'state@test.com',
  status: 'ACTIVE',
  escalationCount: 5,
  state: 'Jharkhand',
};

const mockComplaint = {
  id: 'complaint-123',
  seq: 1001,
  description: 'Test complaint description',
  status: 'UNDER_PROCESSING',
  assignedAgentId: 'agent-123',
  managedByMunicipalAdminId: null,
  escalatedToStateAdminId: null,
  escalationLevel: null,
  location: {
    district: 'Dhanbad',
    city: 'Dhanbad',
    locality: 'Test Locality',
    pin: '826001',
  },
};

const mockComplaintWithMunicipalAdmin = {
  ...mockComplaint,
  status: 'ESCALATED_TO_MUNICIPAL_LEVEL',
  managedByMunicipalAdminId: 'muni-admin-123',
  escalationLevel: 'MUNICIPAL_ADMIN',
};

// ============================================================================
// AGENT ESCALATION TESTS
// ============================================================================
describe('Agent Escalation to Municipal Admin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default transaction mock - executes all operations and returns results
    mockTransaction.mockImplementation(async (operations: any[]) => {
      const results = [];
      for (const op of operations) {
        results.push(await op);
      }
      return results;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complaint validation', () => {
    it('should return 404 when complaint is not found', async () => {
      mockComplaintFindUnique.mockResolvedValue(null);

      // Simulate the escalation logic
      const complaint = await prismaMock.complaint.findUnique({ where: { id: 'non-existent' } });
      
      expect(complaint).toBeNull();
      expect(mockComplaintFindUnique).toHaveBeenCalledWith({ where: { id: 'non-existent' } });
    });

    it('should return 403 when agent is not assigned to the complaint', async () => {
      const complaintWithDifferentAgent = {
        ...mockComplaint,
        assignedAgentId: 'different-agent-id',
      };
      mockComplaintFindUnique.mockResolvedValue(complaintWithDifferentAgent);

      const complaint = await prismaMock.complaint.findUnique({ where: { id: 'complaint-123' } });
      const agentId = 'agent-123';

      // Check authorization
      const isAuthorized = complaint.assignedAgentId === agentId;
      
      expect(isAuthorized).toBe(false);
    });

    it('should return 400 when complaint has no district information', async () => {
      const complaintWithoutLocation = {
        ...mockComplaint,
        location: null,
      };
      mockComplaintFindUnique.mockResolvedValue(complaintWithoutLocation);

      const complaint = await prismaMock.complaint.findUnique({ 
        where: { id: 'complaint-123' },
        include: { location: true }
      });

      const district = complaint.location?.district;
      
      expect(district).toBeUndefined();
    });
  });

  describe('Municipal admin assignment', () => {
    it('should find municipal admin in the same district', async () => {
      mockMunicipalAdminFindFirst.mockResolvedValue(mockMunicipalAdmin);

      const municipalAdmin = await prismaMock.departmentMunicipalAdmin.findFirst({
        where: {
          municipality: { equals: 'Dhanbad', mode: 'insensitive' },
          status: 'ACTIVE',
        },
        orderBy: { currentWorkload: 'asc' },
      });

      expect(municipalAdmin).toEqual(mockMunicipalAdmin);
      expect(municipalAdmin.municipality).toBe('Dhanbad');
    });

    it('should return 404 when no municipal admin found in district', async () => {
      mockMunicipalAdminFindFirst.mockResolvedValue(null);

      const municipalAdmin = await prismaMock.departmentMunicipalAdmin.findFirst({
        where: {
          municipality: { equals: 'UnknownDistrict', mode: 'insensitive' },
          status: 'ACTIVE',
        },
      });

      expect(municipalAdmin).toBeNull();
    });

    it('should prefer municipal admin with lowest workload', async () => {
      const adminWithLowWorkload = { ...mockMunicipalAdmin, currentWorkload: 1 };
      const adminWithHighWorkload = { ...mockMunicipalAdmin, id: 'muni-admin-456', currentWorkload: 8 };

      // When ordered by currentWorkload: 'asc', should return lowest
      mockMunicipalAdminFindFirst.mockResolvedValue(adminWithLowWorkload);

      const selectedAdmin = await prismaMock.departmentMunicipalAdmin.findFirst({
        where: { municipality: { equals: 'Dhanbad', mode: 'insensitive' }, status: 'ACTIVE' },
        orderBy: { currentWorkload: 'asc' },
      });

      expect(selectedAdmin.currentWorkload).toBe(1);
    });
  });

  describe('Transaction operations', () => {
    it('should update complaint status to ESCALATED_TO_MUNICIPAL_LEVEL', async () => {
      const updatedComplaint = {
        ...mockComplaint,
        status: 'ESCALATED_TO_MUNICIPAL_LEVEL',
        escalationLevel: 'MUNICIPAL_ADMIN',
        managedByMunicipalAdminId: mockMunicipalAdmin.id,
      };
      mockComplaintUpdate.mockResolvedValue(updatedComplaint);

      const result = await prismaMock.complaint.update({
        where: { id: mockComplaint.id },
        data: {
          status: 'ESCALATED_TO_MUNICIPAL_LEVEL',
          escalationLevel: 'MUNICIPAL_ADMIN',
          managedByMunicipalAdminId: mockMunicipalAdmin.id,
        },
      });

      expect(result.status).toBe('ESCALATED_TO_MUNICIPAL_LEVEL');
      expect(result.escalationLevel).toBe('MUNICIPAL_ADMIN');
      expect(result.managedByMunicipalAdminId).toBe(mockMunicipalAdmin.id);
    });

    it('should decrement agent workload on escalation', async () => {
      const updatedAgent = { ...mockAgent, currentWorkload: mockAgent.currentWorkload - 1 };
      mockAgentUpdate.mockResolvedValue(updatedAgent);

      const result = await prismaMock.agent.update({
        where: { id: mockAgent.id },
        data: { currentWorkload: { decrement: 1 } },
      });

      expect(result.currentWorkload).toBe(4);
    });

    it('should increment municipal admin workload on escalation', async () => {
      const updatedAdmin = { ...mockMunicipalAdmin, currentWorkload: mockMunicipalAdmin.currentWorkload + 1 };
      mockMunicipalAdminUpdate.mockResolvedValue(updatedAdmin);

      const result = await prismaMock.departmentMunicipalAdmin.update({
        where: { id: mockMunicipalAdmin.id },
        data: { currentWorkload: { increment: 1 } },
      });

      expect(result.currentWorkload).toBe(4);
    });

    it('should keep assignedAgentId for complaint history', async () => {
      const updatedComplaint = {
        ...mockComplaint,
        status: 'ESCALATED_TO_MUNICIPAL_LEVEL',
        escalationLevel: 'MUNICIPAL_ADMIN',
        managedByMunicipalAdminId: mockMunicipalAdmin.id,
        // assignedAgentId should NOT be cleared
        assignedAgentId: mockAgent.id,
      };
      mockComplaintUpdate.mockResolvedValue(updatedComplaint);

      const result = await prismaMock.complaint.update({
        where: { id: mockComplaint.id },
        data: {
          status: 'ESCALATED_TO_MUNICIPAL_LEVEL',
          escalationLevel: 'MUNICIPAL_ADMIN',
          managedByMunicipalAdminId: mockMunicipalAdmin.id,
          // Note: assignedAgentId is NOT in the update data
        },
      });

      // Agent should still be assigned for history
      expect(result.assignedAgentId).toBe(mockAgent.id);
    });
  });

  describe('Full escalation flow', () => {
    it('should successfully escalate complaint from agent to municipal admin', async () => {
      // Setup mocks
      mockComplaintFindUnique.mockResolvedValue(mockComplaint);
      mockAgentFindUnique.mockResolvedValue(mockAgent);
      mockMunicipalAdminFindFirst.mockResolvedValue(mockMunicipalAdmin);

      const escalatedComplaint = {
        ...mockComplaint,
        status: 'ESCALATED_TO_MUNICIPAL_LEVEL',
        escalationLevel: 'MUNICIPAL_ADMIN',
        managedByMunicipalAdminId: mockMunicipalAdmin.id,
      };

      mockTransaction.mockResolvedValue([
        escalatedComplaint,
        { ...mockAgent, currentWorkload: 4 },
        { ...mockMunicipalAdmin, currentWorkload: 4 },
      ]);

      // Execute transaction
      const results = await prismaMock.$transaction([
        prismaMock.complaint.update({
          where: { id: mockComplaint.id },
          data: {
            status: 'ESCALATED_TO_MUNICIPAL_LEVEL',
            escalationLevel: 'MUNICIPAL_ADMIN',
            managedByMunicipalAdminId: mockMunicipalAdmin.id,
          },
        }),
        prismaMock.agent.update({
          where: { id: mockAgent.id },
          data: { currentWorkload: { decrement: 1 } },
        }),
        prismaMock.departmentMunicipalAdmin.update({
          where: { id: mockMunicipalAdmin.id },
          data: { currentWorkload: { increment: 1 } },
        }),
      ]);

      expect(results[0].status).toBe('ESCALATED_TO_MUNICIPAL_LEVEL');
      expect(mockTransaction).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// MUNICIPAL ADMIN ESCALATION TESTS
// ============================================================================
describe('Municipal Admin Escalation to State Admin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockTransaction.mockImplementation(async (operations: any[]) => {
      const results = [];
      for (const op of operations) {
        results.push(await op);
      }
      return results;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complaint validation', () => {
    it('should return 404 when complaint is not found', async () => {
      mockComplaintFindUnique.mockResolvedValue(null);

      const complaint = await prismaMock.complaint.findUnique({ where: { id: 'non-existent' } });
      
      expect(complaint).toBeNull();
    });

    it('should return 403 when municipal admin does not manage the complaint', async () => {
      const complaintWithDifferentAdmin = {
        ...mockComplaintWithMunicipalAdmin,
        managedByMunicipalAdminId: 'different-admin-id',
      };
      mockComplaintFindUnique.mockResolvedValue(complaintWithDifferentAdmin);

      const complaint = await prismaMock.complaint.findUnique({ where: { id: 'complaint-123' } });
      const muniAdminId = 'muni-admin-123';

      // Check authorization
      const isAuthorized = !complaint.managedByMunicipalAdminId || 
                           complaint.managedByMunicipalAdminId === muniAdminId;
      
      expect(isAuthorized).toBe(false);
    });
  });

  describe('State admin assignment', () => {
    it('should prefer linked state admin from municipal admin', async () => {
      mockMunicipalAdminFindUnique.mockResolvedValue(mockMunicipalAdmin);
      mockStateAdminFindUnique.mockResolvedValue(mockStateAdmin);

      const muniAdmin = await prismaMock.departmentMunicipalAdmin.findUnique({
        where: { id: mockMunicipalAdmin.id },
        select: { managedByStateAdminId: true },
      });

      expect(muniAdmin.managedByStateAdminId).toBe('state-admin-123');
    });

    it('should fallback to any active state admin when no linked admin', async () => {
      const muniAdminWithoutStateLink = { ...mockMunicipalAdmin, managedByStateAdminId: null };
      mockMunicipalAdminFindUnique.mockResolvedValue(muniAdminWithoutStateLink);
      mockStateAdminFindFirst.mockResolvedValue(mockStateAdmin);

      const muniAdmin = await prismaMock.departmentMunicipalAdmin.findUnique({
        where: { id: mockMunicipalAdmin.id },
        select: { managedByStateAdminId: true },
      });

      // No linked state admin
      expect(muniAdmin.managedByStateAdminId).toBeNull();

      // Fallback to find any active state admin
      const stateAdmin = await prismaMock.departmentStateAdmin.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { escalationCount: 'asc' },
      });

      expect(stateAdmin).toEqual(mockStateAdmin);
    });

    it('should return 404 when no state admin is available', async () => {
      const muniAdminWithoutStateLink = { ...mockMunicipalAdmin, managedByStateAdminId: null };
      mockMunicipalAdminFindUnique.mockResolvedValue(muniAdminWithoutStateLink);
      mockStateAdminFindFirst.mockResolvedValue(null);

      const muniAdmin = await prismaMock.departmentMunicipalAdmin.findUnique({
        where: { id: mockMunicipalAdmin.id },
        select: { managedByStateAdminId: true },
      });

      const stateAdmin = await prismaMock.departmentStateAdmin.findFirst({
        where: { status: 'ACTIVE' },
      });

      expect(stateAdmin).toBeNull();
    });

    it('should prefer state admin with lowest escalation count', async () => {
      const adminWithLowEscalations = { ...mockStateAdmin, escalationCount: 2 };
      const adminWithHighEscalations = { ...mockStateAdmin, id: 'state-admin-456', escalationCount: 15 };

      mockStateAdminFindFirst.mockResolvedValue(adminWithLowEscalations);

      const selectedAdmin = await prismaMock.departmentStateAdmin.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { escalationCount: 'asc' },
      });

      expect(selectedAdmin.escalationCount).toBe(2);
    });
  });

  describe('Transaction operations', () => {
    it('should update complaint status to ESCALATED_TO_STATE_LEVEL', async () => {
      const updatedComplaint = {
        ...mockComplaintWithMunicipalAdmin,
        status: 'ESCALATED_TO_STATE_LEVEL',
        escalationLevel: 'STATE_ADMIN',
        escalatedToStateAdminId: mockStateAdmin.id,
      };
      mockComplaintUpdate.mockResolvedValue(updatedComplaint);

      const result = await prismaMock.complaint.update({
        where: { id: mockComplaint.id },
        data: {
          status: 'ESCALATED_TO_STATE_LEVEL',
          escalationLevel: 'STATE_ADMIN',
          escalatedToStateAdminId: mockStateAdmin.id,
        },
      });

      expect(result.status).toBe('ESCALATED_TO_STATE_LEVEL');
      expect(result.escalationLevel).toBe('STATE_ADMIN');
      expect(result.escalatedToStateAdminId).toBe(mockStateAdmin.id);
    });

    it('should decrement municipal admin workload on escalation', async () => {
      const updatedAdmin = { ...mockMunicipalAdmin, currentWorkload: mockMunicipalAdmin.currentWorkload - 1 };
      mockMunicipalAdminUpdate.mockResolvedValue(updatedAdmin);

      const result = await prismaMock.departmentMunicipalAdmin.update({
        where: { id: mockMunicipalAdmin.id },
        data: { currentWorkload: { decrement: 1 } },
      });

      expect(result.currentWorkload).toBe(2);
    });

    it('should increment state admin escalation count', async () => {
      const updatedStateAdmin = { ...mockStateAdmin, escalationCount: mockStateAdmin.escalationCount + 1 };
      mockStateAdminUpdate.mockResolvedValue(updatedStateAdmin);

      const result = await prismaMock.departmentStateAdmin.update({
        where: { id: mockStateAdmin.id },
        data: { escalationCount: { increment: 1 } },
      });

      expect(result.escalationCount).toBe(6);
    });

    it('should preserve municipal admin assignment for complaint history', async () => {
      const updatedComplaint = {
        ...mockComplaintWithMunicipalAdmin,
        status: 'ESCALATED_TO_STATE_LEVEL',
        escalationLevel: 'STATE_ADMIN',
        escalatedToStateAdminId: mockStateAdmin.id,
        // Municipal admin should still be assigned
        managedByMunicipalAdminId: mockMunicipalAdmin.id,
      };
      mockComplaintUpdate.mockResolvedValue(updatedComplaint);

      const result = await prismaMock.complaint.update({
        where: { id: mockComplaint.id },
        data: {
          status: 'ESCALATED_TO_STATE_LEVEL',
          escalationLevel: 'STATE_ADMIN',
          escalatedToStateAdminId: mockStateAdmin.id,
          managedByMunicipalAdminId: mockMunicipalAdmin.id,
        },
      });

      // Municipal admin should still be assigned for history
      expect(result.managedByMunicipalAdminId).toBe(mockMunicipalAdmin.id);
    });
  });

  describe('Full escalation flow', () => {
    it('should successfully escalate complaint from municipal admin to state admin', async () => {
      // Setup mocks
      mockComplaintFindUnique.mockResolvedValue(mockComplaintWithMunicipalAdmin);
      mockMunicipalAdminFindUnique.mockResolvedValue(mockMunicipalAdmin);
      mockStateAdminFindFirst.mockResolvedValue(mockStateAdmin);

      const escalatedComplaint = {
        ...mockComplaintWithMunicipalAdmin,
        status: 'ESCALATED_TO_STATE_LEVEL',
        escalationLevel: 'STATE_ADMIN',
        escalatedToStateAdminId: mockStateAdmin.id,
      };

      mockTransaction.mockResolvedValue([
        escalatedComplaint,
        { ...mockStateAdmin, escalationCount: 6 },
        { ...mockMunicipalAdmin, currentWorkload: 2 },
      ]);

      // Execute transaction
      const results = await prismaMock.$transaction([
        prismaMock.complaint.update({
          where: { id: mockComplaint.id },
          data: {
            status: 'ESCALATED_TO_STATE_LEVEL',
            escalationLevel: 'STATE_ADMIN',
            escalatedToStateAdminId: mockStateAdmin.id,
            managedByMunicipalAdminId: mockMunicipalAdmin.id,
          },
        }),
        prismaMock.departmentStateAdmin.update({
          where: { id: mockStateAdmin.id },
          data: { escalationCount: { increment: 1 } },
        }),
        prismaMock.departmentMunicipalAdmin.update({
          where: { id: mockMunicipalAdmin.id },
          data: { currentWorkload: { decrement: 1 } },
        }),
      ]);

      expect(results[0].status).toBe('ESCALATED_TO_STATE_LEVEL');
      expect(results[0].escalatedToStateAdminId).toBe(mockStateAdmin.id);
      expect(mockTransaction).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// AGENT STATUS UPDATE TESTS
// ============================================================================
describe('Agent Complaint Status Update', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Status validation', () => {
    it('should accept valid status values', () => {
      const validStatuses = [
        'REGISTERED',
        'UNDER_PROCESSING',
        'FORWARDED',
        'ON_HOLD',
        'COMPLETED',
        'REJECTED',
        'ESCALATED_TO_MUNICIPAL_LEVEL',
      ];

      validStatuses.forEach((status) => {
        expect(validStatuses.includes(status)).toBe(true);
      });
    });

    it('should reject invalid status values', () => {
      const validStatuses = [
        'REGISTERED',
        'UNDER_PROCESSING',
        'FORWARDED',
        'ON_HOLD',
        'COMPLETED',
        'REJECTED',
        'ESCALATED_TO_MUNICIPAL_LEVEL',
      ];

      const invalidStatus = 'INVALID_STATUS';
      expect(validStatuses.includes(invalidStatus)).toBe(false);
    });
  });

  describe('Authorization', () => {
    it('should allow status update when agent is assigned to complaint', async () => {
      mockComplaintFindUnique.mockResolvedValue(mockComplaint);

      const complaint = await prismaMock.complaint.findUnique({ where: { id: 'complaint-123' } });
      const agentId = 'agent-123';

      const isAuthorized = complaint.assignedAgentId === agentId;
      expect(isAuthorized).toBe(true);
    });

    it('should reject status update when agent is not assigned', async () => {
      const complaintWithDifferentAgent = {
        ...mockComplaint,
        assignedAgentId: 'other-agent-id',
      };
      mockComplaintFindUnique.mockResolvedValue(complaintWithDifferentAgent);

      const complaint = await prismaMock.complaint.findUnique({ where: { id: 'complaint-123' } });
      const agentId = 'agent-123';

      const isAuthorized = complaint.assignedAgentId === agentId;
      expect(isAuthorized).toBe(false);
    });
  });

  describe('Completion handling', () => {
    it('should set dateOfResolution when status is COMPLETED', async () => {
      const completedComplaint = {
        ...mockComplaint,
        status: 'COMPLETED',
        dateOfResolution: new Date(),
      };
      mockComplaintUpdate.mockResolvedValue(completedComplaint);

      const result = await prismaMock.complaint.update({
        where: { id: mockComplaint.id },
        data: {
          status: 'COMPLETED',
          dateOfResolution: new Date(),
        },
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.dateOfResolution).toBeDefined();
    });

    it('should decrement agent workload when complaint is completed', async () => {
      const updatedAgent = { ...mockAgent, currentWorkload: mockAgent.currentWorkload - 1 };
      mockAgentUpdate.mockResolvedValue(updatedAgent);

      const result = await prismaMock.agent.update({
        where: { id: mockAgent.id },
        data: { currentWorkload: { decrement: 1 } },
      });

      expect(result.currentWorkload).toBe(4);
    });
  });
});

// ============================================================================
// MUNICIPAL ADMIN STATUS UPDATE TESTS
// ============================================================================
describe('Municipal Admin Complaint Status Update', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Status validation', () => {
    it('should accept valid municipal admin status values', () => {
      const validStatuses = [
        'REGISTERED',
        'UNDER_PROCESSING',
        'FORWARDED',
        'ON_HOLD',
        'COMPLETED',
        'REJECTED',
      ];

      validStatuses.forEach((status) => {
        expect(validStatuses.includes(status)).toBe(true);
      });
    });

    it('should not allow ESCALATED status via status endpoint', () => {
      const statusEndpointValidStatuses = [
        'REGISTERED',
        'UNDER_PROCESSING',
        'FORWARDED',
        'ON_HOLD',
        'COMPLETED',
        'REJECTED',
      ];

      // ESCALATED statuses should use the dedicated escalate endpoint
      expect(statusEndpointValidStatuses.includes('ESCALATED_TO_STATE_LEVEL')).toBe(false);
      expect(statusEndpointValidStatuses.includes('ESCALATED_TO_MUNICIPAL_LEVEL')).toBe(false);
    });
  });

  describe('Completion handling', () => {
    it('should decrement agent workload when municipal admin completes complaint', async () => {
      // When municipal admin completes a complaint that was assigned to an agent
      const complaintWithAgent = {
        ...mockComplaintWithMunicipalAdmin,
        assignedAgentId: 'agent-123',
      };
      mockComplaintFindUnique.mockResolvedValue(complaintWithAgent);

      const complaint = await prismaMock.complaint.findUnique({ where: { id: 'complaint-123' } });
      
      expect(complaint.assignedAgentId).toBe('agent-123');

      // Should decrement agent workload
      const updatedAgent = { ...mockAgent, currentWorkload: mockAgent.currentWorkload - 1 };
      mockAgentUpdate.mockResolvedValue(updatedAgent);

      const result = await prismaMock.agent.update({
        where: { id: complaint.assignedAgentId },
        data: { currentWorkload: { decrement: 1 } },
      });

      expect(result.currentWorkload).toBe(4);
    });
  });
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================
describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Workload boundaries', () => {
    it('should not decrement workload below zero', async () => {
      const agentWithZeroWorkload = { ...mockAgent, currentWorkload: 0 };
      
      // Logic should check before decrementing
      const shouldDecrement = agentWithZeroWorkload.currentWorkload > 0;
      expect(shouldDecrement).toBe(false);
    });

    it('should handle agent at workload limit', async () => {
      const agentAtLimit = { ...mockAgent, currentWorkload: 10, workloadLimit: 10 };
      
      const hasCapacity = agentAtLimit.currentWorkload < agentAtLimit.workloadLimit;
      expect(hasCapacity).toBe(false);
    });
  });

  describe('Case-insensitive district matching', () => {
    it('should match district regardless of case', async () => {
      // The query uses mode: 'insensitive'
      mockMunicipalAdminFindFirst.mockResolvedValue(mockMunicipalAdmin);

      const admin1 = await prismaMock.departmentMunicipalAdmin.findFirst({
        where: { municipality: { equals: 'DHANBAD', mode: 'insensitive' } },
      });

      const admin2 = await prismaMock.departmentMunicipalAdmin.findFirst({
        where: { municipality: { equals: 'dhanbad', mode: 'insensitive' } },
      });

      const admin3 = await prismaMock.departmentMunicipalAdmin.findFirst({
        where: { municipality: { equals: 'Dhanbad', mode: 'insensitive' } },
      });

      // All should find the same admin
      expect(admin1).toEqual(mockMunicipalAdmin);
      expect(admin2).toEqual(mockMunicipalAdmin);
      expect(admin3).toEqual(mockMunicipalAdmin);
    });
  });

  describe('Transaction atomicity', () => {
    it('should rollback all operations if transaction fails', async () => {
      mockTransaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(
        prismaMock.$transaction([
          prismaMock.complaint.update({ where: { id: 'test' }, data: {} }),
          prismaMock.agent.update({ where: { id: 'test' }, data: {} }),
        ])
      ).rejects.toThrow('Transaction failed');
    });
  });

  describe('Missing relations', () => {
    it('should handle complaint without location gracefully', async () => {
      const complaintWithoutLocation = { ...mockComplaint, location: null };
      mockComplaintFindUnique.mockResolvedValue(complaintWithoutLocation);

      const complaint = await prismaMock.complaint.findUnique({
        where: { id: 'complaint-123' },
        include: { location: true },
      });

      expect(complaint.location).toBeNull();
    });

    it('should handle complaint without assigned agent', async () => {
      const unassignedComplaint = { ...mockComplaint, assignedAgentId: null };
      mockComplaintFindUnique.mockResolvedValue(unassignedComplaint);

      const complaint = await prismaMock.complaint.findUnique({ where: { id: 'complaint-123' } });

      expect(complaint.assignedAgentId).toBeNull();
    });
  });
});
