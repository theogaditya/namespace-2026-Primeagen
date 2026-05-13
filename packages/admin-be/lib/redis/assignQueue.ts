import { redisClient } from './redisClient';

// Queue name shared with user-be (complaint:processed:queue)
const PROCESSED_QUEUE_NAME = 'complaint:processed:queue';

// Type for processed complaint data pushed by user-be
export interface ProcessedComplaint {
  id: string;
  seq: number;
  status: string;
  categoryId: string;
  subCategory: string;
  assignedDepartment: string;
  city: string;
  district: string;
}

/**
 * Get the current length of the processed complaint queue
 */
export async function getProcessedQueueLength(): Promise<number> {
  try {
    await redisClient.connect();
    const client = redisClient.getClient();
    return await client.lLen(PROCESSED_QUEUE_NAME);
  } catch (error) {
    console.error('Error getting processed queue length:', error);
    throw error;
  }
}

/**
 * Peek at the first complaint in the queue without removing it
 * Returns parsed JSON object or null if queue is empty
 */
export async function peekProcessedQueue(): Promise<ProcessedComplaint | null> {
  try {
    await redisClient.connect();
    const client = redisClient.getClient();
    const raw = await client.lIndex(PROCESSED_QUEUE_NAME, 0);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ProcessedComplaint;
    } catch (parseErr) {
      console.error('Error parsing peeked complaint:', parseErr);
      return null;
    }
  } catch (error) {
    console.error('Error peeking processed queue:', error);
    throw error;
  }
}

/**
 * Pop (remove and return) the first complaint from the queue
 * Returns parsed JSON object or null if queue is empty
 */
export async function popProcessedQueue(): Promise<ProcessedComplaint | null> {
  try {
    await redisClient.connect();
    const client = redisClient.getClient();
    const raw = await client.lPop(PROCESSED_QUEUE_NAME);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ProcessedComplaint;
    } catch (parseErr) {
      console.error('Error parsing popped complaint:', parseErr);
      return null;
    }
  } catch (error) {
    console.error('Error popping from processed queue:', error);
    throw error;
  }
}

/**
 * Fetch all complaints currently in the queue (without removing them)
 * Useful for debugging or batch processing
 */
export async function getAllProcessedComplaints(): Promise<ProcessedComplaint[]> {
  try {
    await redisClient.connect();
    const client = redisClient.getClient();
    const rawList = await client.lRange(PROCESSED_QUEUE_NAME, 0, -1);
    return rawList
      .map((raw) => {
        try {
          return JSON.parse(raw) as ProcessedComplaint;
        } catch {
          return null;
        }
      })
      .filter((item): item is ProcessedComplaint => item !== null);
  } catch (error) {
    console.error('Error fetching all processed complaints:', error);
    throw error;
  }
}

// Polling state
let isPolling = false;
let pollingInterval: NodeJS.Timeout | null = null;

/**
 * Process a single complaint from the queue
 * Override this function or pass a handler to startAssignmentPolling
 */
export type ComplaintHandler = (complaint: ProcessedComplaint) => Promise<void>;

/**
 * Start polling the processed queue for complaints to assign
 * @param handler - async function to handle each complaint
 * @param intervalMs - polling interval in milliseconds (default 10s)
 */
export function startAssignmentPolling(
  handler: ComplaintHandler,
  intervalMs: number = 10000
): void {
  if (isPolling) {
    console.log('Assignment polling is already running');
    return;
  }

  isPolling = true;
  console.log(`Assignment polling started (${intervalMs / 1000}s interval)`);

  pollingInterval = setInterval(async () => {
    try {
      const complaint = await peekProcessedQueue();
      if (!complaint) {
        // Queue is empty, nothing to process
        return;
      }

      console.log(`Processing complaint for assignment: id=${complaint.id}, seq=${complaint.seq}, city=${complaint.city}`);

      // Process the complaint (e.g., auto-assign to agent)
      await handler(complaint);

      // Only pop after successful processing
      await popProcessedQueue();
      console.log(`Complaint removed from queue after processing: id=${complaint.id}`);
    } catch (error) {
      console.error('Error during assignment polling:', error);
      // Do not pop on error - complaint stays in queue for retry
    }
  }, intervalMs);
}

/**
 * Stop the assignment polling
 */
export function stopAssignmentPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  isPolling = false;
  console.log('Assignment polling stopped');
}

/**
 * Check if assignment polling is currently running
 */
export function isAssignmentPollingActive(): boolean {
  return isPolling;
}
