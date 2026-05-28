import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Import the actual modules to test
import { InMemoryLikeStore, likeStore } from '../lib/likes/inMemoryLikeStore';

describe('InMemoryLikeStore', () => {
  let store: InMemoryLikeStore;

  beforeEach(() => {
    store = new InMemoryLikeStore();
  });

  afterEach(() => {
    store.clear();
  });

  describe('hasLiked', () => {
    it('should return false for user who has not liked anything', () => {
      expect(store.hasLiked('user-1', 'complaint-1')).toBe(false);
    });

    it('should return true after user likes a complaint', () => {
      store.toggle('user-1', 'complaint-1');
      expect(store.hasLiked('user-1', 'complaint-1')).toBe(true);
    });

    it('should return false after user unlikes a complaint', () => {
      store.toggle('user-1', 'complaint-1'); // like
      store.toggle('user-1', 'complaint-1'); // unlike
      expect(store.hasLiked('user-1', 'complaint-1')).toBe(false);
    });
  });

  describe('toggle', () => {
    it('should like a complaint that is not liked', () => {
      const result = store.toggle('user-1', 'complaint-1');
      
      expect(result.liked).toBe(true);
      expect(result.count).toBe(1);
      expect(result.complaintId).toBe('complaint-1');
    });

    it('should unlike a complaint that is already liked', () => {
      store.toggle('user-1', 'complaint-1'); // like first
      const result = store.toggle('user-1', 'complaint-1'); // unlike
      
      expect(result.liked).toBe(false);
      expect(result.count).toBe(0);
    });

    it('should correctly track multiple likes from different users', () => {
      store.toggle('user-1', 'complaint-1');
      store.toggle('user-2', 'complaint-1');
      store.toggle('user-3', 'complaint-1');
      
      expect(store.getLikeCount('complaint-1')).toBe(3);
      expect(store.hasLiked('user-1', 'complaint-1')).toBe(true);
      expect(store.hasLiked('user-2', 'complaint-1')).toBe(true);
      expect(store.hasLiked('user-3', 'complaint-1')).toBe(true);
    });

    it('should not go below 0 when unliking', () => {
      // Set count to 0 first
      store.setLikeCount('complaint-1', 0);
      
      // Force an unlike (simulate edge case)
      store.setLike('user-1', 'complaint-1', true);
      const result = store.toggle('user-1', 'complaint-1');
      
      expect(result.count).toBe(0);
      expect(result.liked).toBe(false);
    });

    it('should queue events for sync', () => {
      store.toggle('user-1', 'complaint-1');
      store.toggle('user-2', 'complaint-1');
      
      expect(store.getPendingSyncCount()).toBe(2);
    });
  });

  describe('getLikeCount', () => {
    it('should return 0 for unknown complaint', () => {
      expect(store.getLikeCount('unknown-complaint')).toBe(0);
    });

    it('should return correct count after multiple operations', () => {
      store.toggle('user-1', 'complaint-1'); // +1
      store.toggle('user-2', 'complaint-1'); // +1
      store.toggle('user-1', 'complaint-1'); // -1
      
      expect(store.getLikeCount('complaint-1')).toBe(1);
    });
  });

  describe('getUserLikes', () => {
    it('should return empty set for user with no likes', () => {
      const likes = store.getUserLikes('user-1');
      expect(likes.size).toBe(0);
    });

    it('should return all complaints liked by a user', () => {
      store.toggle('user-1', 'complaint-1');
      store.toggle('user-1', 'complaint-2');
      store.toggle('user-1', 'complaint-3');
      
      const likes = store.getUserLikes('user-1');
      expect(likes.size).toBe(3);
      expect(likes.has('complaint-1')).toBe(true);
      expect(likes.has('complaint-2')).toBe(true);
      expect(likes.has('complaint-3')).toBe(true);
    });
  });

  describe('loadUserLikes', () => {
    it('should load user likes from array', () => {
      store.loadUserLikes('user-1', ['complaint-1', 'complaint-2', 'complaint-3']);
      
      expect(store.hasLiked('user-1', 'complaint-1')).toBe(true);
      expect(store.hasLiked('user-1', 'complaint-2')).toBe(true);
      expect(store.hasLiked('user-1', 'complaint-3')).toBe(true);
      expect(store.hasLiked('user-1', 'complaint-4')).toBe(false);
    });

    it('should replace existing likes when loading', () => {
      store.toggle('user-1', 'old-complaint');
      store.loadUserLikes('user-1', ['new-complaint-1', 'new-complaint-2']);
      
      expect(store.hasLiked('user-1', 'old-complaint')).toBe(false);
      expect(store.hasLiked('user-1', 'new-complaint-1')).toBe(true);
    });
  });

  describe('loadLikeCounts', () => {
    it('should load multiple like counts at once', () => {
      const counts = new Map([
        ['complaint-1', 100],
        ['complaint-2', 50],
        ['complaint-3', 25],
      ]);
      
      store.loadLikeCounts(counts);
      
      expect(store.getLikeCount('complaint-1')).toBe(100);
      expect(store.getLikeCount('complaint-2')).toBe(50);
      expect(store.getLikeCount('complaint-3')).toBe(25);
    });
  });

  describe('sync functionality', () => {
    it('should trigger callback when sync is needed', () => {
      const syncCallback = vi.fn();
      store.onSync(syncCallback);
      
      // Fill queue to trigger sync (batch size is 100)
      for (let i = 0; i < 100; i++) {
        store.toggle(`user-${i}`, 'complaint-1');
      }
      
      expect(syncCallback).toHaveBeenCalledTimes(1);
      expect(syncCallback).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should return events on triggerSync', () => {
      store.toggle('user-1', 'complaint-1');
      store.toggle('user-2', 'complaint-2');
      
      const events = store.triggerSync();
      
      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({
        userId: 'user-1',
        complaintId: 'complaint-1',
        liked: true,
      });
    });

    it('should clear pending queue after triggerSync', () => {
      store.toggle('user-1', 'complaint-1');
      store.triggerSync();
      
      expect(store.getPendingSyncCount()).toBe(0);
    });
  });

  describe('clearUser', () => {
    it('should remove user data', () => {
      store.toggle('user-1', 'complaint-1');
      store.toggle('user-1', 'complaint-2');
      
      store.clearUser('user-1');
      
      expect(store.hasLiked('user-1', 'complaint-1')).toBe(false);
      expect(store.hasLiked('user-1', 'complaint-2')).toBe(false);
    });

    it('should not affect other users', () => {
      store.toggle('user-1', 'complaint-1');
      store.toggle('user-2', 'complaint-1');
      
      store.clearUser('user-1');
      
      expect(store.hasLiked('user-2', 'complaint-1')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      store.toggle('user-1', 'complaint-1');
      store.toggle('user-1', 'complaint-2');
      store.toggle('user-2', 'complaint-1');
      store.toggle('user-3', 'complaint-3');
      
      const stats = store.getStats();
      
      expect(stats.totalUsers).toBe(3);
      expect(stats.totalComplaints).toBe(3);
      expect(stats.pendingSyncCount).toBe(4);
      expect(stats.totalLikesTracked).toBe(4);
    });
  });

  describe('O(1) performance', () => {
    it('should handle large number of likes efficiently', () => {
      const startTime = performance.now();
      
      // Simulate 10,000 users liking the same complaint
      for (let i = 0; i < 10000; i++) {
        store.toggle(`user-${i}`, 'popular-complaint');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete in under 100ms (O(1) per operation)
      expect(duration).toBeLessThan(100);
      expect(store.getLikeCount('popular-complaint')).toBe(10000);
    });

    it('should have O(1) lookup time', () => {
      // Preload many likes
      for (let i = 0; i < 10000; i++) {
        store.setLike('user-1', `complaint-${i}`, true);
      }
      
      const startTime = performance.now();
      
      // Check multiple lookups
      for (let i = 0; i < 1000; i++) {
        store.hasLiked('user-1', `complaint-${i}`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 1000 lookups should complete in under 10ms
      expect(duration).toBeLessThan(10);
    });
  });
});

describe('Singleton likeStore', () => {
  beforeEach(() => {
    likeStore.clear();
  });

  it('should be the same instance', async () => {
    likeStore.toggle('user-1', 'complaint-1');
    
    // Dynamic import to verify singleton pattern
    const { likeStore: anotherRef } = await import('../lib/likes/inMemoryLikeStore');
    expect(anotherRef.hasLiked('user-1', 'complaint-1')).toBe(true);
  });
});
