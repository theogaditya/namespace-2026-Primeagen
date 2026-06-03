/**
 * React Hook for Offline Queue
 * 
 * Provides easy integration with React components for offline queue management
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getQueueCount,
  isOnline,
  setupAutoSync,
  attemptInitialSync,
  flushQueue,
  queueComplaint,
} from "./index";
import type { ComplaintFormState } from "@/app/regComplaint/customComps/types";
import type { FlushResult, QueueStatus } from "./types";

interface UseOfflineQueueOptions {
  /** Enable automatic sync when coming back online */
  autoSync?: boolean;
  /** Callback when sync starts */
  onSyncStart?: () => void;
  /** Callback when sync completes */
  onSyncComplete?: (result: FlushResult) => void;
  /** Callback on sync error */
  onSyncError?: (error: Error) => void;
  /** Callback when a complaint is queued offline */
  onQueued?: (id: string) => void;
}

interface UseOfflineQueueReturn {
  /** Number of complaints in the queue */
  queueCount: number;
  /** Whether the browser is currently online */
  online: boolean;
  /** Whether a sync operation is in progress */
  isSyncing: boolean;
  /** Queue a complaint (will submit if online, queue if offline) */
  submitOrQueue: (formState: ComplaintFormState) => Promise<{ success: boolean; queued: boolean; error?: string }>;
  /** Manually trigger a sync */
  manualSync: () => Promise<FlushResult>;
  /** Refresh the queue count */
  refreshQueueCount: () => Promise<void>;
}

export function useOfflineQueue(
  options: UseOfflineQueueOptions = {}
): UseOfflineQueueReturn {
  const {
    autoSync = true,
    onSyncStart,
    onSyncComplete,
    onSyncError,
    onQueued,
  } = options;

  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const initialSyncDone = useRef(false);

  // Refresh queue count from localStorage
  const refreshQueueCount = useCallback(async () => {
    const count = await getQueueCount();
    setQueueCount(count);
  }, []);

  // Update online status
  useEffect(() => {
    if (typeof window === "undefined") return;

    setOnline(isOnline());

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Initial queue count fetch
  useEffect(() => {
    refreshQueueCount();
  }, [refreshQueueCount]);

  // Set up auto sync on coming back online
  useEffect(() => {
    if (!autoSync) return;

    const cleanup = setupAutoSync(
      () => {
        setIsSyncing(true);
        onSyncStart?.();
      },
      async (result) => {
        setIsSyncing(false);
        await refreshQueueCount();
        onSyncComplete?.(result);
      },
      (error) => {
        setIsSyncing(false);
        onSyncError?.(error);
      }
    );

    return cleanup;
  }, [autoSync, onSyncStart, onSyncComplete, onSyncError, refreshQueueCount]);

  // Attempt initial sync on mount
  useEffect(() => {
    if (initialSyncDone.current) return;
    initialSyncDone.current = true;

    (async () => {
      if (isOnline()) {
        setIsSyncing(true);
        try {
          const result = await attemptInitialSync();
          if (result && result.totalProcessed > 0) {
            onSyncComplete?.(result);
          }
        } catch (error) {
          onSyncError?.(error instanceof Error ? error : new Error("Unknown error"));
        } finally {
          setIsSyncing(false);
          await refreshQueueCount();
        }
      }
    })();
  }, [onSyncComplete, onSyncError, refreshQueueCount]);

  // Submit or queue a complaint
  const submitOrQueue = useCallback(
    async (
      formState: ComplaintFormState
    ): Promise<{ success: boolean; queued: boolean; error?: string }> => {
      // If offline, queue immediately
      if (!isOnline()) {
        const result = await queueComplaint(formState);
        if (result.success) {
          await refreshQueueCount();
          onQueued?.(result.queuedId!);
          return { success: true, queued: true };
        }
        return { success: false, queued: false, error: result.error };
      }

      // If online, try to submit directly
      try {
        const formData = new FormData();
        formData.append("categoryId", formState.categoryId);
        formData.append("categoryName", formState.categoryName);
        formData.append("assignedDepartment", formState.assignedDepartment);
        formData.append("subCategory", formState.subCategory);
        formData.append("description", formState.description);
        formData.append("urgency", formState.urgency);
        formData.append("isPublic", String(formState.isPublic));
        formData.append("district", formState.district);
        formData.append("pin", formState.pin);
        formData.append("city", formState.city);
        formData.append("locality", formState.locality);
        formData.append("street", formState.street);
        formData.append("latitude", formState.latitude);
        formData.append("longitude", formState.longitude);
        if (formState.photo) {
          formData.append("photo", formState.photo);
        }

        const response = await fetch("/api/complaint/submit", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }

        return { success: true, queued: false };
      } catch (error) {
        // If online submission fails, queue it
        console.log("[useOfflineQueue] Online submission failed, queueing:", error);
        const result = await queueComplaint(formState);
        if (result.success) {
          await refreshQueueCount();
          onQueued?.(result.queuedId!);
          return { success: true, queued: true };
        }
        return { success: false, queued: false, error: result.error };
      }
    },
    [refreshQueueCount, onQueued]
  );

  // Manual sync trigger - only works when online
  const manualSync = useCallback(async (): Promise<FlushResult> => {
    // Don't sync if offline
    if (!isOnline()) {
      console.log("[useOfflineQueue] Cannot sync - currently offline");
      return {
        totalProcessed: 0,
        successCount: 0,
        failedCount: 0,
        remainingInQueue: queueCount,
        errors: [],
      };
    }

    // Don't sync if nothing in queue
    const currentCount = await getQueueCount();
    if (currentCount === 0) {
      return {
        totalProcessed: 0,
        successCount: 0,
        failedCount: 0,
        remainingInQueue: 0,
        errors: [],
      };
    }

    setIsSyncing(true);
    onSyncStart?.();
    try {
      const result = await flushQueue();
      await refreshQueueCount();
      // Only call onSyncComplete if something was actually processed
      if (result.totalProcessed > 0) {
        onSyncComplete?.(result);
      }
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Unknown error");
      onSyncError?.(err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [queueCount, onSyncStart, onSyncComplete, onSyncError, refreshQueueCount]);

  return {
    queueCount,
    online,
    isSyncing,
    submitOrQueue,
    manualSync,
    refreshQueueCount,
  };
}

export default useOfflineQueue;
