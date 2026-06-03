/**
 * Offline Queue Types
 * Types for managing complaints in offline/online scenarios
 */

import type { ComplaintUrgency, Department } from "@/app/regComplaint/customComps/types";

/**
 * Serializable complaint data for offline storage
 * Note: File objects cannot be stored in localStorage, so we store base64 encoded image
 */
export interface QueuedComplaint {
  id: string; // UUID for tracking
  createdAt: number; // timestamp when queued
  retryCount: number; // number of failed sync attempts
  lastRetryAt?: number; // timestamp of last retry attempt

  // Complaint data (mirrors ComplaintFormState but serializable)
  categoryId: string;
  categoryName: string;
  assignedDepartment: Department | "";
  subCategory: string;
  description: string;
  urgency: ComplaintUrgency;
  isPublic: boolean;
  
  // Image stored as base64 data URL (since File objects can't be serialized)
  photoBase64: string | null;
  photoMimeType: string | null;
  photoFileName: string | null;
  
  // Location
  district: string;
  pin: string;
  city: string;
  locality: string;
  street: string;
  latitude: string;
  longitude: string;
}

/**
 * Result of a queue operation
 */
export interface QueueOperationResult {
  success: boolean;
  error?: string;
  queuedId?: string;
}

/**
 * Result of a flush/sync operation
 */
export interface FlushResult {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  remainingInQueue: number;
  errors: { id: string; error: string }[];
}

/**
 * Queue status information
 */
export interface QueueStatus {
  count: number;
  isOnline: boolean;
  oldestItemAge?: number; // milliseconds since oldest item was queued
}

/**
 * Options for flush operation
 */
export interface FlushOptions {
  maxRetries?: number; // max retries per item before giving up
  retryDelayMs?: number; // delay between retry attempts
  onProgress?: (processed: number, total: number) => void;
}
