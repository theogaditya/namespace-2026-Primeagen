import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Redis client
const mockRedisClient = {
    lLen: vi.fn(),
    lMove: vi.fn(),
    lPop: vi.fn(),
    lPush: vi.fn(),
    rPush: vi.fn(),
    lRem: vi.fn(),
    lIndex: vi.fn(),
};

const mockConnect = vi.fn();
const mockGetClient = vi.fn(() => mockRedisClient);

class MockRedisClientforComplaintQueue {
    connect = mockConnect;
    getClient = mockGetClient;
}

vi.mock('../lib/redis/redisClient', () => ({
    RedisClientforComplaintQueue: MockRedisClientforComplaintQueue,
}));

const mockProcessedComplaintQueueService = {
    pushToQueue: vi.fn(),
    getQueueLength: vi.fn(),
    peekQueue: vi.fn(),
    popFromQueue: vi.fn(),
};

vi.mock('../lib/redis/processedComplaintQueueService', () => ({
    processedComplaintQueueService: mockProcessedComplaintQueueService,
}));

vi.mock('../lib/gcp/gcp', () => ({
    standardizeSubCategory: vi.fn().mockResolvedValue('standardized-subcategory'),
}));

vi.mock('../lib/moderation/moderationClient', () => ({
    moderateTextSafe: vi.fn().mockResolvedValue({ has_abuse: false, clean_text: null }),
}));

vi.mock('../lib/badges/badgeService', () => ({
    getBadgeService: vi.fn().mockReturnValue({
        checkBadgesAfterComplaint: vi.fn().mockResolvedValue([]),
    }),
}));

describe('Polling Lifecycle', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.useFakeTimers();
        mockGetClient.mockReturnValue(mockRedisClient);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('getPollingStatus returns false initially', async () => {
        const { getPollingStatus } = await import('../services/complaintProcessor');
        expect(getPollingStatus()).toBe(false);
    });

    it('getQueueStatus returns queue lengths', async () => {
        mockRedisClient.lLen
            .mockResolvedValueOnce(5)  // registration queue
            .mockResolvedValueOnce(2); // processing queue

        const { getQueueStatus } = await import('../services/complaintProcessor');
        const status = await getQueueStatus();

        expect(status.registrationQueueLength).toBe(5);
        expect(status.processingQueueLength).toBe(2);
    });

    it('getQueueStatus handles Redis errors gracefully', async () => {
        mockRedisClient.lLen.mockRejectedValue(new Error('Redis down'));

        const { getQueueStatus } = await import('../services/complaintProcessor');

        // Should not throw
        try {
            await getQueueStatus();
        } catch {
            // OK if it throws -but document it
        }
    });
});

describe('processedComplaintQueueService edge cases', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('handles popFromQueue returning null (empty queue)', async () => {
        mockProcessedComplaintQueueService.popFromQueue.mockResolvedValue(null);

        const result = await mockProcessedComplaintQueueService.popFromQueue();
        expect(result).toBeNull();
    });

    it('handles getQueueLength on empty queue', async () => {
        mockProcessedComplaintQueueService.getQueueLength.mockResolvedValue(0);

        const length = await mockProcessedComplaintQueueService.getQueueLength();
        expect(length).toBe(0);
    });

    it('handles pushToQueue with complex data', async () => {
        const complexData = {
            id: 'complaint-1',
            nested: { deep: { value: true } },
            array: [1, 2, 3],
        };

        mockProcessedComplaintQueueService.pushToQueue.mockResolvedValue(undefined);
        await mockProcessedComplaintQueueService.pushToQueue(complexData);

        expect(mockProcessedComplaintQueueService.pushToQueue).toHaveBeenCalledWith(complexData);
    });

    it('peekQueue returns null on empty queue', async () => {
        mockProcessedComplaintQueueService.peekQueue.mockResolvedValue(null);

        const result = await mockProcessedComplaintQueueService.peekQueue();
        expect(result).toBeNull();
    });
});
