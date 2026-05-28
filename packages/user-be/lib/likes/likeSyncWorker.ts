/**
 * Like Sync Worker
 * 
 * Handles batch synchronization of likes to PostgreSQL.
 * Runs asynchronously to avoid blocking the main like flow.
 */

import { PrismaClient } from "../../prisma/generated/client/client";
import { LikeEvent, likeStore } from "./inMemoryLikeStore";

export class LikeSyncWorker {
  private db: PrismaClient;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isProcessing: boolean = false;
  private readonly SYNC_INTERVAL_MS = 10000; // 10 seconds
  
  constructor(db: PrismaClient) {
    this.db = db;
  }
  
  /**
   * Start the sync worker
   */
  start(): void {
    if (this.syncInterval) {
      return; // Already running
    }
    
    // Register callback with like store
    likeStore.onSync((events) => {
      this.processEvents(events).catch(console.error);
    });
    
    // Also run periodic sync for any remaining events
    this.syncInterval = setInterval(() => {
      const events = likeStore.triggerSync();
      if (events.length > 0) {
        this.processEvents(events).catch(console.error);
      }
    }, this.SYNC_INTERVAL_MS);
    
    console.log("✅ Like sync worker started");
  }
  
  /**
   * Stop the sync worker
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log("🛑 Like sync worker stopped");
  }
  
  /**
   * Process a batch of like events
   */
  async processEvents(events: LikeEvent[]): Promise<void> {
    if (events.length === 0 || this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // Deduplicate events - keep only the latest action per user-complaint pair
      const latestEvents = this.deduplicateEvents(events);
      
      // Separate likes and unlikes
      const likes = latestEvents.filter(e => e.liked);
      const unlikes = latestEvents.filter(e => !e.liked);
      
      // Process in parallel
      await Promise.all([
        this.processLikes(likes),
        this.processUnlikes(unlikes),
      ]);
      
      console.log(`✅ Synced ${likes.length} likes and ${unlikes.length} unlikes to DB`);
    } catch (error) {
      console.error("❌ Error syncing likes to DB:", error);
      // Re-queue failed events (simplified - in production, use a proper retry mechanism)
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Deduplicate events - keep only the latest action per user-complaint pair
   */
  private deduplicateEvents(events: LikeEvent[]): LikeEvent[] {
    const eventMap = new Map<string, LikeEvent>();
    
    for (const event of events) {
      const key = `${event.userId}:${event.complaintId}`;
      const existing = eventMap.get(key);
      
      if (!existing || event.timestamp > existing.timestamp) {
        eventMap.set(key, event);
      }
    }
    
    return Array.from(eventMap.values());
  }
  
  /**
   * Process like events - create upvote records
   */
  private async processLikes(events: LikeEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    // Use createMany with skipDuplicates for efficiency
    // This handles the unique constraint gracefully
    const data = events.map(e => ({
      userId: e.userId,
      complaintId: e.complaintId,
    }));
    
    try {
      await this.db.upvote.createMany({
        data,
        skipDuplicates: true,
      });
      
      // Update complaint upvote counts
      await this.updateComplaintCounts(events.map(e => e.complaintId), 'increment');
    } catch (error) {
      console.error("Error processing likes:", error);
      throw error;
    }
  }
  
  /**
   * Process unlike events - delete upvote records
   */
  private async processUnlikes(events: LikeEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    try {
      // Delete in batch using OR conditions
      const conditions = events.map(e => ({
        userId: e.userId,
        complaintId: e.complaintId,
      }));
      
      await this.db.upvote.deleteMany({
        where: {
          OR: conditions,
        },
      });
      
      // Update complaint upvote counts
      await this.updateComplaintCounts(events.map(e => e.complaintId), 'decrement');
    } catch (error) {
      console.error("Error processing unlikes:", error);
      throw error;
    }
  }
  
  /**
   * Update complaint upvote counts in batch
   */
  private async updateComplaintCounts(
    complaintIds: string[],
    operation: 'increment' | 'decrement'
  ): Promise<void> {
    // Count occurrences of each complaint
    const countMap = new Map<string, number>();
    for (const id of complaintIds) {
      countMap.set(id, (countMap.get(id) ?? 0) + 1);
    }
    
    // Update each complaint's count
    const updates = Array.from(countMap.entries()).map(([complaintId, count]) =>
      this.db.complaint.update({
        where: { id: complaintId },
        data: {
          upvoteCount: operation === 'increment'
            ? { increment: count }
            : { decrement: count },
        },
      }).catch(err => {
        // Complaint might not exist, log and continue
        console.warn(`Failed to update count for complaint ${complaintId}:`, err.message);
      })
    );
    
    await Promise.all(updates);
  }
  
  /**
   * Load initial like counts from DB for complaints
   */
  async loadComplaintCounts(complaintIds: string[]): Promise<Map<string, number>> {
    const complaints = await this.db.complaint.findMany({
      where: { id: { in: complaintIds } },
      select: { id: true, upvoteCount: true },
    });
    
    const counts = new Map<string, number>();
    for (const complaint of complaints) {
      counts.set(complaint.id, complaint.upvoteCount);
    }
    
    return counts;
  }
  
  /**
   * Load user's liked complaints from DB
   */
  async loadUserLikes(userId: string): Promise<string[]> {
    const upvotes = await this.db.upvote.findMany({
      where: { userId },
      select: { complaintId: true },
    });
    
    return upvotes.map(u => u.complaintId);
  }
  
  /**
   * Force sync all pending events (useful for graceful shutdown)
   */
  async forceSync(): Promise<void> {
    const events = likeStore.triggerSync();
    if (events.length > 0) {
      await this.processEvents(events);
    }
  }
}

// Factory function to create worker
export function createLikeSyncWorker(db: PrismaClient): LikeSyncWorker {
  return new LikeSyncWorker(db);
}
