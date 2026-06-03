/**
 * Offline Complaint Queue - Core Logic
 * 
 * Stores complaints in localStorage when offline and syncs them when back online.
 * This is the web-only implementation (no Capacitor JS dependencies).
 */

import type {
  QueuedComplaint,
  QueueOperationResult,
  FlushResult,
  QueueStatus,
  FlushOptions,
} from "./types";
import type { ComplaintFormState } from "@/app/regComplaint/customComps/types";

const QUEUE_KEY = "swarajdesk_offline_complaints_queue";
const MAX_RETRIES_DEFAULT = 3;
const RETRY_DELAY_DEFAULT = 5000; // 5 seconds

/**
 * Generate a unique ID for queued items
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  if (!isBrowser()) return true;
  return navigator.onLine;
}

/**
 * Read the queue from localStorage
 */
export async function readQueue(): Promise<QueuedComplaint[]> {
  if (!isBrowser()) return [];
  
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedComplaint[];
  } catch (error) {
    console.error("[OfflineQueue] Error reading queue:", error);
    return [];
  }
}

/**
 * Write the queue to localStorage
 */
export async function writeQueue(queue: QueuedComplaint[]): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("[OfflineQueue] Error writing queue:", error);
    throw error;
  }
}

/**
 * Convert a File to base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert base64 data URL back to a File object
 */
export function base64ToFile(
  base64: string,
  fileName: string,
  mimeType: string
): File {
  // Extract the base64 data from the data URL
  const arr = base64.split(",");
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: mimeType });
}

/**
 * Convert ComplaintFormState to QueuedComplaint (serializable)
 */
export async function formStateToQueuedComplaint(
  formState: ComplaintFormState
): Promise<QueuedComplaint> {
  let photoBase64: string | null = null;
  let photoMimeType: string | null = null;
  let photoFileName: string | null = null;

  if (formState.photo) {
    photoBase64 = await fileToBase64(formState.photo);
    photoMimeType = formState.photo.type;
    photoFileName = formState.photo.name;
  }

  return {
    id: generateId(),
    createdAt: Date.now(),
    retryCount: 0,
    categoryId: formState.categoryId,
    categoryName: formState.categoryName,
    assignedDepartment: formState.assignedDepartment,
    subCategory: formState.subCategory,
    description: formState.description,
    urgency: formState.urgency,
    isPublic: formState.isPublic,
    photoBase64,
    photoMimeType,
    photoFileName,
    district: formState.district,
    pin: formState.pin,
    city: formState.city,
    locality: formState.locality,
    street: formState.street,
    latitude: formState.latitude,
    longitude: formState.longitude,
  };
}

/**
 * Convert QueuedComplaint back to FormData for API submission
 */
export function queuedComplaintToFormData(complaint: QueuedComplaint): FormData {
  const formData = new FormData();
  
  formData.append("categoryId", complaint.categoryId);
  formData.append("assignedDepartment", complaint.assignedDepartment);
  formData.append("subCategory", complaint.subCategory);
  formData.append("description", complaint.description);
  formData.append("urgency", complaint.urgency);
  formData.append("isPublic", String(complaint.isPublic));

  // Build location object as expected by backend (same format as direct submission)
  const locationData: {
    district: string;
    pin: string;
    city: string;
    locality: string;
    latitude?: number;
    longitude?: number;
  } = {
    district: complaint.district,
    pin: complaint.pin,
    city: complaint.city,
    locality: complaint.locality,
  };

  if (complaint.latitude) {
    locationData.latitude = parseFloat(complaint.latitude);
  }
  if (complaint.longitude) {
    locationData.longitude = parseFloat(complaint.longitude);
  }

  formData.append("location", JSON.stringify(locationData));

  // Reconstruct the file if we have base64 data
  if (complaint.photoBase64 && complaint.photoFileName && complaint.photoMimeType) {
    const file = base64ToFile(
      complaint.photoBase64,
      complaint.photoFileName,
      complaint.photoMimeType
    );
    formData.append("image", file);  // Backend expects "image" not "photo"
  }

  return formData;
}

/**
 * Add a complaint to the offline queue
 */
export async function queueComplaint(
  formState: ComplaintFormState
): Promise<QueueOperationResult> {
  try {
    const queuedComplaint = await formStateToQueuedComplaint(formState);
    const queue = await readQueue();
    queue.push(queuedComplaint);
    await writeQueue(queue);
    
    console.log("[OfflineQueue] Complaint queued:", queuedComplaint.id);
    
    return {
      success: true,
      queuedId: queuedComplaint.id,
    };
  } catch (error) {
    console.error("[OfflineQueue] Error queueing complaint:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Remove a complaint from the queue by ID
 */
export async function removeFromQueue(id: string): Promise<boolean> {
  try {
    const queue = await readQueue();
    const filtered = queue.filter((item) => item.id !== id);
    if (filtered.length === queue.length) return false;
    await writeQueue(filtered);
    return true;
  } catch (error) {
    console.error("[OfflineQueue] Error removing from queue:", error);
    return false;
  }
}

/**
 * Get the current queue status
 */
export async function getQueueStatus(): Promise<QueueStatus> {
  const queue = await readQueue();
  const online = isOnline();
  
  let oldestItemAge: number | undefined;
  if (queue.length > 0) {
    const oldest = Math.min(...queue.map((item) => item.createdAt));
    oldestItemAge = Date.now() - oldest;
  }
  
  return {
    count: queue.length,
    isOnline: online,
    oldestItemAge,
  };
}

/**
 * Get the queue count
 */
export async function getQueueCount(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

/**
 * Get the auth token from localStorage
 */
function getAuthToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem("authToken");
}

/**
 * Submit a single complaint to the backend
 */
async function submitComplaint(complaint: QueuedComplaint): Promise<void> {
  const formData = queuedComplaintToFormData(complaint);
  const token = getAuthToken();
  
  if (!token) {
    throw new Error("Authentication required. Please login again.");
  }
  
  const response = await fetch("/api/complaint/submit", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Failed to submit complaint: ${response.status} - ${errorText}`);
  }
}

/**
 * Flush the queue - attempt to submit all queued complaints
 */
export async function flushQueue(options: FlushOptions = {}): Promise<FlushResult> {
  const {
    maxRetries = MAX_RETRIES_DEFAULT,
    onProgress,
  } = options;
  
  const queue = await readQueue();
  
  if (queue.length === 0) {
    return {
      totalProcessed: 0,
      successCount: 0,
      failedCount: 0,
      remainingInQueue: 0,
      errors: [],
    };
  }
  
  if (!isOnline()) {
    console.log("[OfflineQueue] Cannot flush - offline");
    return {
      totalProcessed: 0,
      successCount: 0,
      failedCount: 0,
      remainingInQueue: queue.length,
      errors: [],
    };
  }
  
  const remaining: QueuedComplaint[] = [];
  const errors: { id: string; error: string }[] = [];
  let successCount = 0;
  
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    
    // Skip items that have exceeded max retries
    if (item.retryCount >= maxRetries) {
      remaining.push(item);
      errors.push({ id: item.id, error: `Exceeded max retries (${maxRetries})` });
      continue;
    }
    
    try {
      await submitComplaint(item);
      successCount++;
      console.log("[OfflineQueue] Successfully submitted:", item.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[OfflineQueue] Failed to submit:", item.id, errorMessage);
      
      // Update retry count and keep in queue
      remaining.push({
        ...item,
        retryCount: item.retryCount + 1,
        lastRetryAt: Date.now(),
      });
      errors.push({ id: item.id, error: errorMessage });
    }
    
    // Report progress
    onProgress?.(i + 1, queue.length);
  }
  
  // Update the queue with remaining items
  await writeQueue(remaining);
  
  const result: FlushResult = {
    totalProcessed: queue.length,
    successCount,
    failedCount: errors.length,
    remainingInQueue: remaining.length,
    errors,
  };
  
  console.log("[OfflineQueue] Flush complete:", result);
  
  return result;
}

/**
 * Clear all items from the queue (use with caution!)
 */
export async function clearQueue(): Promise<void> {
  await writeQueue([]);
  console.log("[OfflineQueue] Queue cleared");
}

/**
 * Set up automatic sync when coming back online
 * Returns a cleanup function to remove the listener
 */
export function setupAutoSync(
  onSyncStart?: () => void,
  onSyncComplete?: (result: FlushResult) => void,
  onError?: (error: Error) => void
): () => void {
  if (!isBrowser()) return () => {};
  
  const handleOnline = async () => {
    console.log("[OfflineQueue] Back online - checking for queued items");
    
    // Check if there's anything to sync first
    const queue = await readQueue();
    if (queue.length === 0) {
      console.log("[OfflineQueue] No items to sync");
      return;
    }
    
    console.log("[OfflineQueue] Starting auto sync for", queue.length, "items");
    onSyncStart?.();
    
    try {
      const result = await flushQueue();
      // Only call onSyncComplete if something was actually processed
      if (result.totalProcessed > 0) {
        onSyncComplete?.(result);
      }
    } catch (error) {
      console.error("[OfflineQueue] Auto sync error:", error);
      onError?.(error instanceof Error ? error : new Error("Unknown error"));
    }
  };
  
  window.addEventListener("online", handleOnline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener("online", handleOnline);
  };
}

/**
 * Attempt initial sync if online (call on app mount)
 */
export async function attemptInitialSync(): Promise<FlushResult | null> {
  if (!isOnline()) {
    console.log("[OfflineQueue] Skipping initial sync - offline");
    return null;
  }
  
  const queue = await readQueue();
  if (queue.length === 0) {
    console.log("[OfflineQueue] No items to sync on startup");
    return null;
  }
  
  console.log("[OfflineQueue] Starting initial sync for", queue.length, "items");
  return flushQueue();
}
