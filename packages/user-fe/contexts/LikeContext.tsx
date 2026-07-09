"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { useLikeWebSocket, LikeUpdate } from "@/hooks/useLikeWebSocket";

// Like state for a complaint
interface LikeState {
  liked: boolean;
  count: number;
}

// Context value
interface LikeContextValue {
  // Connection status
  isConnected: boolean;
  isAuthenticated: boolean;

  // Like state
  getLikeState: (complaintId: string) => LikeState;

  // Actions
  toggleLike: (complaintId: string) => void;

  // Initialize likes from API response
  initializeLikes: (complaints: Array<{ id: string; upvoteCount: number; hasLiked?: boolean }>) => void;

  // Check if a specific complaint is being liked (optimistic UI)
  isLiking: (complaintId: string) => boolean;
}

const LikeContext = createContext<LikeContextValue | null>(null);

interface LikeProviderProps {
  children: ReactNode;
  authToken: string | null;
}

export function LikeProvider({ children, authToken }: LikeProviderProps) {
  // Map of complaintId -> { liked, count }
  const [likeStates, setLikeStates] = useState<Map<string, LikeState>>(new Map());

  // Set of complaintIds currently being toggled (for optimistic UI)
  const [pendingLikes, setPendingLikes] = useState<Set<string>>(new Set());
  const pendingLikesRef = useRef<Set<string>>(new Set());

  // Snapshots for rollback on disconnect
  const optimisticSnapshotsRef = useRef<Map<string, LikeState>>(new Map());

  // Handle incoming like updates from WebSocket
  const handleLikeUpdate = useCallback((update: LikeUpdate) => {
    setLikeStates((prev) => {
      const next = new Map(prev);
      const existing = prev.get(update.complaintId);

      // If 'liked' is explicitly set (direct response to our own action), use it.
      // If 'liked' is undefined (broadcast to other users), preserve our existing state.
      const newLiked = update.liked !== undefined
        ? update.liked
        : (existing?.liked ?? false);

      next.set(update.complaintId, {
        liked: newLiked,
        count: Math.max(0, update.count ?? 0),
      });
      return next;
    });

    // Remove from pending & clear rollback snapshot
    pendingLikesRef.current.delete(update.complaintId);
    setPendingLikes((prev) => {
      const next = new Set(prev);
      next.delete(update.complaintId);
      return next;
    });
    optimisticSnapshotsRef.current.delete(update.complaintId);
  }, []);

  // WebSocket connection
  const {
    isConnected,
    isAuthenticated,
    toggleLike: wsToggleLike,
  } = useLikeWebSocket({
    authToken,
    onLikeUpdate: handleLikeUpdate,
    onConnect: () => console.log("✅ Like WebSocket connected"),
    onDisconnect: () => console.log("⚠️ Like WebSocket disconnected"),
  });

  // Get like state for a complaint
  const getLikeState = useCallback((complaintId: string): LikeState => {
    return likeStates.get(complaintId) || { liked: false, count: 0 };
  }, [likeStates]);

  // Toggle like with optimistic update
  const toggleLike = useCallback((complaintId: string) => {
    if (!isAuthenticated) {
      console.warn("Cannot like: not authenticated to WebSocket");
      return;
    }

    if (pendingLikesRef.current.has(complaintId)) {
      return;
    }

    pendingLikesRef.current.add(complaintId);

    // Mark as pending
    setPendingLikes((prev) => {
      const next = new Set(prev);
      next.add(complaintId);
      return next;
    });

    // Save snapshot for rollback before mutating
    setLikeStates((prev) => {
      const current = prev.get(complaintId) || { liked: false, count: 0 };
      // Only save snapshot if we don't already have one (rapid double-tap guard)
      if (!optimisticSnapshotsRef.current.has(complaintId)) {
        optimisticSnapshotsRef.current.set(complaintId, { ...current });
      }

      const next = new Map(prev);
      const newLiked = !current.liked;
      next.set(complaintId, {
        liked: newLiked,
        count: newLiked
          ? Math.max(0, current.count) + 1
          : Math.max(0, current.count - 1),
      });
      return next;
    });

    // Send via WebSocket
    wsToggleLike(complaintId);
  }, [isAuthenticated, wsToggleLike]);

  // Initialize likes from API response (for initial load and re-fetch)
  // Always uses fresh API data — the server is the source of truth
  const initializeLikes = useCallback((complaints: Array<{ id: string; upvoteCount: number; hasLiked?: boolean }>) => {
    setLikeStates((prev) => {
      const next = new Map(prev);
      for (const complaint of complaints) {
        // Always use fresh API values for both liked and count.
        // This prevents stale optimistic state from persisting across re-fetches.
        next.set(complaint.id, {
          liked: complaint.hasLiked ?? false,
          count: Math.max(0, complaint.upvoteCount ?? 0),
        });
      }
      return next;
    });
  }, []);

  // Rollback pending optimistic updates on WebSocket disconnect
  useEffect(() => {
    if (!isConnected && optimisticSnapshotsRef.current.size > 0) {
      setLikeStates((prev) => {
        const next = new Map(prev);
        for (const [complaintId, snapshot] of optimisticSnapshotsRef.current) {
          next.set(complaintId, snapshot);
        }
        return next;
      });
      pendingLikesRef.current.clear();
      setPendingLikes(new Set());
      optimisticSnapshotsRef.current.clear();
    }
  }, [isConnected]);

  // Check if complaint is pending
  const isLiking = useCallback((complaintId: string): boolean => {
    return pendingLikes.has(complaintId);
  }, [pendingLikes]);

  const value: LikeContextValue = {
    isConnected,
    isAuthenticated,
    getLikeState,
    toggleLike,
    initializeLikes,
    isLiking,
  };

  return (
    <LikeContext.Provider value={value}>
      {children}
    </LikeContext.Provider>
  );
}

// Hook to use like context
export function useLikes() {
  const context = useContext(LikeContext);
  if (!context) {
    throw new Error("useLikes must be used within a LikeProvider");
  }
  return context;
}

// Hook for a single complaint's like state
export function useComplaintLike(complaintId: string) {
  const { getLikeState, toggleLike, isLiking } = useLikes();

  const state = getLikeState(complaintId);
  const pending = isLiking(complaintId);

  const toggle = useCallback(() => {
    toggleLike(complaintId);
  }, [toggleLike, complaintId]);

  return {
    liked: state.liked,
    count: state.count,
    isLiking: pending,
    toggle,
  };
}
