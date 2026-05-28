/**
 * In-Memory Like Store
 * 
 * Ultra-fast O(1) operations for tracking user likes.
 * This is the primary source of truth during runtime.
 * Data is synced to Redis (counters) and PostgreSQL (persistence) asynchronously.
 */

export interface LikeEvent {
  userId: string;
  complaintId: string;
  liked: boolean;
  timestamp: number;
}

export interface LikeToggleResult {
  liked: boolean;
  count: number;
  complaintId: string;
}

export class InMemoryLikeStore {
  // userId → Set<complaintId> - tracks which complaints each user has liked
  private userLikes: Map<string, Set<string>> = new Map();
  
  // complaintId → count - tracks total likes per complaint
  private likeCounts: Map<string, number> = new Map();
  
  // Queue of pending changes to sync to DB
  private pendingSyncQueue: LikeEvent[] = [];
  
  // Callback for when sync queue needs processing
  private onSyncNeeded?: (events: LikeEvent[]) => void;
  
  // Batch size before triggering sync
  private readonly SYNC_BATCH_SIZE = 100;
  
  /**
   * Check if a user has liked a specific complaint
   * O(1) operation
   */
  hasLiked(userId: string, complaintId: string): boolean {
    return this.userLikes.get(userId)?.has(complaintId) ?? false;
  }
  
  /**
   * Get like count for a complaint
   * O(1) operation
   */
  getLikeCount(complaintId: string): number {
    return this.likeCounts.get(complaintId) ?? 0;
  }
  
  /**
   * Get all complaints liked by a user
   * O(1) operation to get the set
   */
  getUserLikes(userId: string): Set<string> {
    return this.userLikes.get(userId) ?? new Set();
  }
  
  /**
   * Toggle like status for a user on a complaint
   * Returns the new state and count
   * O(1) operation
   */
  toggle(userId: string, complaintId: string): LikeToggleResult {
    // Get or create user's like set
    let userSet = this.userLikes.get(userId);
    if (!userSet) {
      userSet = new Set();
      this.userLikes.set(userId, userSet);
    }
    
    const wasLiked = userSet.has(complaintId);
    const currentCount = this.likeCounts.get(complaintId) ?? 0;
    
    let newCount: number;
    if (wasLiked) {
      // Unlike
      userSet.delete(complaintId);
      newCount = Math.max(0, currentCount - 1);
    } else {
      // Like
      userSet.add(complaintId);
      newCount = currentCount + 1;
    }
    
    this.likeCounts.set(complaintId, newCount);
    
    // Queue for async DB sync
    const event: LikeEvent = {
      userId,
      complaintId,
      liked: !wasLiked,
      timestamp: Date.now(),
    };
    this.pendingSyncQueue.push(event);
    
    // Check if we should trigger sync
    if (this.pendingSyncQueue.length >= this.SYNC_BATCH_SIZE) {
      this.triggerSync();
    }
    
    return {
      liked: !wasLiked,
      count: newCount,
      complaintId,
    };
  }
  
  /**
   * Set like status explicitly (used for loading from DB)
   */
  setLike(userId: string, complaintId: string, liked: boolean): void {
    let userSet = this.userLikes.get(userId);
    if (!userSet) {
      userSet = new Set();
      this.userLikes.set(userId, userSet);
    }
    
    if (liked) {
      userSet.add(complaintId);
    } else {
      userSet.delete(complaintId);
    }
  }
  
  /**
   * Set like count for a complaint (used for loading from DB/Redis)
   */
  setLikeCount(complaintId: string, count: number): void {
    this.likeCounts.set(complaintId, count);
  }
  
  /**
   * Load user's likes from an array (used when user connects)
   */
  loadUserLikes(userId: string, complaintIds: string[]): void {
    this.userLikes.set(userId, new Set(complaintIds));
  }
  
  /**
   * Load multiple like counts at once (used on startup)
   */
  loadLikeCounts(counts: Map<string, number>): void {
    for (const [complaintId, count] of counts) {
      this.likeCounts.set(complaintId, count);
    }
  }
  
  /**
   * Register callback for sync events
   */
  onSync(callback: (events: LikeEvent[]) => void): void {
    this.onSyncNeeded = callback;
  }
  
  /**
   * Trigger sync of pending events
   */
  triggerSync(): LikeEvent[] {
    if (this.pendingSyncQueue.length === 0) {
      return [];
    }
    
    const events = [...this.pendingSyncQueue];
    this.pendingSyncQueue = [];
    
    if (this.onSyncNeeded) {
      this.onSyncNeeded(events);
    }
    
    return events;
  }
  
  /**
   * Get pending sync queue size
   */
  getPendingSyncCount(): number {
    return this.pendingSyncQueue.length;
  }
  
  /**
   * Clear user data (used on disconnect/logout)
   */
  clearUser(userId: string): void {
    this.userLikes.delete(userId);
  }
  
  /**
   * Get stats for monitoring
   */
  getStats(): {
    totalUsers: number;
    totalComplaints: number;
    pendingSyncCount: number;
    totalLikesTracked: number;
  } {
    let totalLikesTracked = 0;
    for (const userSet of this.userLikes.values()) {
      totalLikesTracked += userSet.size;
    }
    
    return {
      totalUsers: this.userLikes.size,
      totalComplaints: this.likeCounts.size,
      pendingSyncCount: this.pendingSyncQueue.length,
      totalLikesTracked,
    };
  }
  
  /**
   * Clear all data (useful for testing)
   */
  clear(): void {
    this.userLikes.clear();
    this.likeCounts.clear();
    this.pendingSyncQueue = [];
  }
}

// Singleton instance
export const likeStore = new InMemoryLikeStore();
