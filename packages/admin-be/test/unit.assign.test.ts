import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';

// Mock processed complaint queue service
const mockPopFromQueue = vi.fn();
const mockGetQueueLength = vi.fn();
const mockPeekQueue = vi.fn();

vi.mock('../lib/redis/processedComplaintQueueService', () => ({
  processedComplaintQueueService: {
    popFromQueue: mockPopFromQueue,
    getQueueLength: mockGetQueueLength,
    peekQueue: mockPeekQueue,
  },
}));

// Mock Prisma client
const mockComplaintFindUnique = vi.fn();
const mockComplaintUpdate = vi.fn();
const mockAgentFindMany = vi.fn();
const mockAgentUpdate = vi.fn();
const mockMunicipalAdminFindMany = vi.fn();
const mockMunicipalAdminUpdate = vi.fn();
const mockTransaction = vi.fn();

const prismaMock: any = {
  complaint: {
    findUnique: mockComplaintFindUnique,
    update: mockComplaintUpdate,
  },
  agent: {
    findMany: mockAgentFindMany,
    update: mockAgentUpdate,
  },
  departmentMunicipalAdmin: {
    findMany: mockMunicipalAdminFindMany,
    update: mockMunicipalAdminUpdate,
  },
  $transaction: mockTransaction,
};

vi.mock('../lib/prisma', () => ({
  getPrisma: () => prismaMock,
}));

describe('autoAssignComplaint', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Setup transaction to execute all operations
    mockTransaction.mockImplementation(async (operations: any[]) => {
      for (const op of operations) {
        await op;
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Queue handling', () => {
    it('returns failure when processed queue is empty', async () => {
      mockPopFromQueue.mockResolvedValue(null);

      const { autoAssignComplaint } = await import('../routes/autoAssign');
      const result = await autoAssignComplaint();

      expect(result.success).toBe(false);
      expect(result.message).toBe('No complaints in processed queue');
      expect(mockPopFromQueue).toHaveBeenCalled();
    });

    it('returns failure when complaint not found in database', async () => {
      mockPopFromQueue.mockResolvedValue({
        id: 'non-existent-id',
        assignedDepartment: 'INFRASTRUCTURE',
        district: 'Dhanbad',
      });
      mockComplaintFindUnique.mockResolvedValue(null);

      const { autoAssignComplaint } = await import('../routes/autoAssign');
      const result = await autoAssignComplaint();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Complaint non-existent-id not found');
      expect(result.complaintId).toBe('non-existent-id');
    });

    it('returns failure when complaint has no district information', async () => {
      mockPopFromQueue.mockResolvedValue({
        id: 'complaint-1',
        assignedDepartment: 'INFRASTRUCTURE',
        district: null,
      });
      mockComplaintFindUnique.mockResolvedValue({
        id: 'complaint-1',
        location: null, // No location
      });

      const { autoAssignComplaint } = await import('../routes/autoAssign');
      const result = await autoAssignComplaint();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Complaint complaint-1 has no district');
    });
  });

  describe('Agent assignment (AGENT_DEPARTMENTS)', () => {
    const agentDepartments = [
      'INFRASTRUCTURE',
      'WATER_SUPPLY_SANITATION',
      'ELECTRICITY_POWER',
      'MUNICIPAL_SERVICES',
      'ENVIRONMENT',
      'POLICE_SERVICES',
    ];

    it.each(agentDepartments)('assigns %s department complaints to agents', async (department) => {
      const mockComplaint = {
        id: 'complaint-1',
        assignedDepartment: department,
        location: { district: 'Dhanbad' },
      };

      const mockAgent = {
        id: 'agent-1',
        fullName: 'Test Agent',
        municipality: 'Dhanbad',
        currentWorkload: 2,
        workloadLimit: 10,
        status: 'ACTIVE',
      };

      mockPopFromQueue.mockResolvedValue({
        id: 'complaint-1',
        assignedDepartment: department,
        district: 'Dhanbad',
      });
      mockComplaintFindUnique.mockResolvedValue(mockComplaint);
      mockAgentFindMany.mockResolvedValue([mockAgent]);

      const { autoAssignComplaint } = await import('../routes/autoAssign');
      const result = await autoAssignComplaint();

      expect(result.success).toBe(true);
      expect(result.assignedTo?.type).toBe('agent');
      expect(result.assignedTo?.id).toBe('agent-1');
      expect(result.assignedTo?.name).toBe('Test Agent');
      expect(mockAgentFindMany).toHaveBeenCalled();
    });

    it('assigns complaint to random agent when multiple agents available', async () => {
      const mockAgents = [
        { id: 'agent-1', fullName: 'Agent One', municipality: 'Dhanbad', currentWorkload: 2, workloadLimit: 10, status: 'ACTIVE' },
        { id: 'agent-2', fullName: 'Agent Two', municipality: 'Dhanbad', currentWorkload: 3, workloadLimit: 10, status: 'ACTIVE' },
        { id: 'agent-3', fullName: 'Agent Three', municipality: 'Dhanbad', currentWorkload: 1, workloadLimit: 10, status: 'ACTIVE' },
      ];

      mockPopFromQueue.mockResolvedValue({
        id: 'complaint-1',
        assignedDepartment: 'INFRASTRUCTURE',
        district: 'Dhanbad',
      });
      mockComplaintFindUnique.mockResolvedValue({
        id: 'complaint-1',
        location: { district: 'Dhanbad' },
      });
      mockAgentFindMany.mockResolvedValue(mockAgents);

      const { autoAssignComplaint } = await import('../routes/autoAssign');
      const result = await autoAssignComplaint();

      expect(result.success).toBe(true);
      expect(result.assignedTo?.type).toBe('agent');
      expect(['agent-1', 'agent-2', 'agent-3']).toContain(result.assignedTo?.id);
    });

    it('filters out agents at workload capacity', async () => {
      const mockAgents = [
        { id: 'agent-1', fullName: 'Full Agent', municipality: 'Dhanbad', currentWorkload: 10, workloadLimit: 10, status: 'ACTIVE' },
        { id: 'agent-2', fullName: 'Available Agent', municipality: 'Dhanbad', currentWorkload: 5, workloadLimit: 10, status: 'ACTIVE' },
      ];

      mockPopFromQueue.mockResolvedValue({
        id: 'complaint-1',
        assignedDepartment: 'INFRASTRUCTURE',
        district: 'Dhanbad',
      });
      mockComplaintFindUnique.mockResolvedValue({
        id: 'complaint-1',
        location: { district: 'Dhanbad' },
      });
      mockAgentFindMany.mockResolvedValue(mockAgents);

      const { autoAssignComplaint } = await import('../routes/autoAssign');
      const result = await autoAssignComplaint();

      expect(result.success).toBe(true);
      expect(result.assignedTo?.id).toBe('agent-2');
      expect(result.assignedTo?.name).toBe('Available Agent');
    });

    it('returns failure when no agents available in municipality', async () => {
      mockPopFromQueue.mockResolvedValue({
        id: 'complaint-1',
        assignedDepartment: 'INFRASTRUCTURE',
        district: 'Dhanbad',
      });
      mockComplaintFindUnique.mockResolvedValue({
        id: 'complaint-1',
        location: { district: 'Dhanbad' },
      });
      mockAgentFindMany.mockResolvedValue([]);

      const { autoAssignComplaint } = await import('../routes/autoAssign');
      const result = await autoAssignComplaint();

      expect(result.success).toBe(false);
      expect(result.message).toContain('No available agents');
      expect(result.message).toContain('Dhanbad');
    });

    it('returns failure when all agents are at capacity', async () => {
      const mockAgents = [
        { id: 'agent-1', fullName: 'Full Agent 1', municipality: 'Dhanbad', currentWorkload: 10, workloadLimit: 10, status: 'ACTIVE' },
        { id: 'agent-2', fullName: 'Full Agent 2', municipality: 'Dhanbad', currentWorkload: 10, workloadLimit: 10, status: 'ACTIVE' },
      ];

      mockPopFromQueue.mockResolvedValue({
        id: 'complaint-1',
        assignedDepartment: 'INFRASTRUCTURE',
        district: 'Dhanbad',
      });
      mockComplaintFindUnique.mockResolvedValue({
        id: 'complaint-1',
        location: { district: 'Dhanbad' },
      });
      mockAgentFindMany.mockResolvedValue(mockAgents);

      const { autoAssignComplaint } = await import('../routes/autoAssign');
      const result = await autoAssignComplaint();

      expect(result.success).toBe(false);
      expect(result.message).toContain('No available agents');
    });

    it('uses case-insensitive district matching for agents', async () => {
      mockPopFromQueue.mockResolvedValue({
        id: 'complaint-1',
        assignedDepartment: 'INFRASTRUCTURE',
        district: 'DHANBAD', // Uppercase
      });
      mockComplaintFindUnique.mockResolvedValue({
        id: 'complaint-1',
        location: { district: 'DHANBAD' },
      });
      mockAgentFindMany.mockResolvedValue([
        { id: 'agent-1', fullName: 'Agent', municipality: 'dhanbad', currentWorkload: 0, workloadLimit: 10, status: 'ACTIVE' },
      ]);

      const { autoAssignComplaint } = await import('../routes/autoAssign');
      const result = await autoAssignComplaint();

      // Verify case-insensitive query was used
      expect(mockAgentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            municipality: expect.objectContaining({
              mode: 'insensitive',
            }),
          }),
        })
      );
    });
  });

  describe('Municipal Admin assignment (MUNICIPAL_ADMIN_DEPARTMENTS)', () => {
    const municipalDepartments = [
      'EDUCATION',
      'REVENUE',
      'HEALTH',
      'TRANSPORTATION',
      'HOUSING_URBAN_DEVELOPMENT',
      'SOCIAL_WELFARE',
      'PUBLIC_GRIEVANCES',
    ];

    it.each(municipalDepartments)('assigns %s department complaints to municipal admins', async (department) => {
      const mockComplaint = {
        id: 'complaint-1',
        assignedDepartment: department,
        location: { district: 'Ranchi' },
      };

      const mockAdmin = {
        id: 'admin-1',
        fullName: 'Test Admin',
        municipality: 'Ranchi',
        currentWorkload: 2,
        workloadLimit: 10,
        status: 'ACTIVE',
      };

      mockPopFromQueue.mockResolvedValue({
        id: 'complaint-1',
        assignedDepartment: department,
        district: 'Ranchi',
      });
      mockComplaintFindUnique.mockResolvedValue(mockComplaint);
      mockAgentFindMany.mockResolvedValue([]); // No agents (shouldn't be called anyway)
      mockMunicipalAdminFindMany.mockResolvedValue([mockAdmin]);

      const { autoAssignComplaint } = await import('../routes/autoAssign');
      const result = await autoAssignComplaint();

      expect(result.success).toBe(true);
      expect(result.assignedTo?.type).toBe('municipal_admin');
      expect(result.assignedTo?.id).toBe('admin-1');
      expect(result.assignedTo?.name).toBe('Test Admin');
      expect(mockMunicipalAdminFindMany).toHaveBeenCalled();
    });

    it('returns failure when no municipal admins available', async () => {
      mockPopFromQueue.mockResolvedValue({
        id: 'complaint-1',
        assignedDepartment: 'EDUCATION',
        district: 'Ranchi',
      });
      mockComplaintFindUnique.mockResolvedValue({
        id: 'complaint-1',
        location: { district: 'Ranchi' },
      });
      mockMunicipalAdminFindMany.mockResolvedValue([]);

      const { autoAssignComplaint } = await import('../routes/autoAssign');
      const result = await autoAssignComplaint();

      expect(result.success).toBe(false);
      expect(result.message).toContain('No available municipal admins');
      expect(result.message).toContain('Ranchi');
    });

    it('filters out municipal admins at workload capacity', async () => {
      const mockAdmins = [
        { id: 'admin-1', fullName: 'Full Admin', municipality: 'Ranchi', currentWorkload: 10, workloadLimit: 10, status: 'ACTIVE' },
        { id: 'admin-2', fullName: 'Available Admin', municipality: 'Ranchi', currentWorkload: 3, workloadLimit: 10, status: 'ACTIVE' },
      ];

      mockPopFromQueue.mockResolvedValue({
        id: 'complaint-1',
        assignedDepartment: 'HEALTH',
        district: 'Ranchi',
      });
      mockComplaintFindUnique.mockResolvedValue({
        id: 'complaint-1',
        location: { district: 'Ranchi' },
      });
      mockMunicipalAdminFindMany.mockResolvedValue(mockAdmins);

      const { autoAssignComplaint } = await import('../routes/autoAssign');
      const result = await autoAssignComplaint();

      expect(result.success).toBe(true);
      expect(result.assignedTo?.id).toBe('admin-2');
      expect(result.assignedTo?.name).toBe('Available Admin');
    });
  });

  describe('Unknown department handling', () => {
    it('returns failure for unknown department', async () => {
      mockPopFromQueue.mockResolvedValue({
        id: 'complaint-1',
        assignedDepartment: 'UNKNOWN_DEPARTMENT',
        district: 'Dhanbad',
      });
      mockComplaintFindUnique.mockResolvedValue({
        id: 'complaint-1',
        location: { district: 'Dhanbad' },
      });

      const { autoAssignComplaint } = await import('../routes/autoAssign');
      const result = await autoAssignComplaint();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown department');
      expect(result.message).toContain('UNKNOWN_DEPARTMENT');
    });
  });

  describe('District fallback', () => {
    it('uses complaint location district when available', async () => {
      mockPopFromQueue.mockResolvedValue({
        id: 'complaint-1',
        assignedDepartment: 'INFRASTRUCTURE',
        district: 'QueueDistrict',
      });
      mockComplaintFindUnique.mockResolvedValue({
        id: 'complaint-1',
        location: { district: 'LocationDistrict' },
      });
      mockAgentFindMany.mockResolvedValue([
        { id: 'agent-1', fullName: 'Agent', municipality: 'LocationDistrict', currentWorkload: 0, workloadLimit: 10, status: 'ACTIVE' },
      ]);

      const { autoAssignComplaint } = await import('../routes/autoAssign');
      await autoAssignComplaint();

      // Should query with LocationDistrict, not QueueDistrict
      expect(mockAgentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            municipality: expect.objectContaining({
              equals: 'LocationDistrict',
            }),
          }),
        })
      );
    });

    it('falls back to queue district when complaint location is null', async () => {
      mockPopFromQueue.mockResolvedValue({
        id: 'complaint-1',
        assignedDepartment: 'INFRASTRUCTURE',
        district: 'QueueDistrict',
      });
      mockComplaintFindUnique.mockResolvedValue({
        id: 'complaint-1',
        location: null,
      });
      mockAgentFindMany.mockResolvedValue([
        { id: 'agent-1', fullName: 'Agent', municipality: 'QueueDistrict', currentWorkload: 0, workloadLimit: 10, status: 'ACTIVE' },
      ]);

      const { autoAssignComplaint } = await import('../routes/autoAssign');
      await autoAssignComplaint();

      expect(mockAgentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            municipality: expect.objectContaining({
              equals: 'QueueDistrict',
            }),
          }),
        })
      );
    });
  });
});

describe('processAutoAssignBatch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockTransaction.mockImplementation(async (operations: any[]) => {
      for (const op of operations) {
        await op;
      }
    });
  });

  it('processes multiple complaints until queue is empty', async () => {
    let callCount = 0;
    mockPopFromQueue.mockImplementation(() => {
      callCount++;
      if (callCount <= 3) {
        return Promise.resolve({
          id: `complaint-${callCount}`,
          assignedDepartment: 'INFRASTRUCTURE',
          district: 'Dhanbad',
        });
      }
      return Promise.resolve(null);
    });

    mockComplaintFindUnique.mockResolvedValue({
      id: 'complaint-1',
      location: { district: 'Dhanbad' },
    });
    mockAgentFindMany.mockResolvedValue([
      { id: 'agent-1', fullName: 'Agent', municipality: 'Dhanbad', currentWorkload: 0, workloadLimit: 10, status: 'ACTIVE' },
    ]);

    const { processAutoAssignBatch } = await import('../routes/autoAssign');
    const result = await processAutoAssignBatch(10);

    expect(result.processed).toBe(3);
    expect(result.successful).toBe(3);
    expect(result.failed).toBe(0);
  });

  it('respects the limit parameter', async () => {
    mockPopFromQueue.mockResolvedValue({
      id: 'complaint-1',
      assignedDepartment: 'INFRASTRUCTURE',
      district: 'Dhanbad',
    });
    mockComplaintFindUnique.mockResolvedValue({
      id: 'complaint-1',
      location: { district: 'Dhanbad' },
    });
    mockAgentFindMany.mockResolvedValue([
      { id: 'agent-1', fullName: 'Agent', municipality: 'Dhanbad', currentWorkload: 0, workloadLimit: 10, status: 'ACTIVE' },
    ]);

    const { processAutoAssignBatch } = await import('../routes/autoAssign');
    const result = await processAutoAssignBatch(2);

    expect(result.processed).toBe(2);
    expect(mockPopFromQueue).toHaveBeenCalledTimes(2);
  });

  it('counts failed assignments correctly', async () => {
    let callCount = 0;
    mockPopFromQueue.mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve({
          id: `complaint-${callCount}`,
          assignedDepartment: 'INFRASTRUCTURE',
          district: 'Dhanbad',
        });
      }
      return Promise.resolve(null);
    });

    mockComplaintFindUnique.mockResolvedValue({
      id: 'complaint-1',
      location: { district: 'Dhanbad' },
    });
    mockAgentFindMany.mockResolvedValue([]); // No agents available

    const { processAutoAssignBatch } = await import('../routes/autoAssign');
    const result = await processAutoAssignBatch(10);

    expect(result.processed).toBe(2);
    expect(result.successful).toBe(0);
    expect(result.failed).toBe(2);
  });
});

describe('Polling functions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(async () => {
    // Clean up polling
    const { stopAutoAssignPolling } = await import('../routes/autoAssign');
    stopAutoAssignPolling();
  });

  it('startAutoAssignPolling can be called without error', async () => {
    const { startAutoAssignPolling, stopAutoAssignPolling } = await import('../routes/autoAssign');
    
    // Should not throw
    expect(() => startAutoAssignPolling()).not.toThrow();
    
    stopAutoAssignPolling();
  });

  it('stopAutoAssignPolling can be called without error', async () => {
    const { startAutoAssignPolling, stopAutoAssignPolling } = await import('../routes/autoAssign');
    
    startAutoAssignPolling();
    
    // Should not throw
    expect(() => stopAutoAssignPolling()).not.toThrow();
  });

  it('startAutoAssignPolling is idempotent (calling twice does not error)', async () => {
    const { startAutoAssignPolling, stopAutoAssignPolling } = await import('../routes/autoAssign');
    
    // Should not throw when called twice
    expect(() => {
      startAutoAssignPolling();
      startAutoAssignPolling();
    }).not.toThrow();
    
    stopAutoAssignPolling();
  });

  it('stopAutoAssignPolling is idempotent (calling twice does not error)', async () => {
    const { startAutoAssignPolling, stopAutoAssignPolling } = await import('../routes/autoAssign');
    
    startAutoAssignPolling();
    
    // Should not throw when called twice
    expect(() => {
      stopAutoAssignPolling();
      stopAutoAssignPolling();
    }).not.toThrow();
  });
});
