"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
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

  // Handle incoming like updates from WebSocket
  const handleLikeUpdate = useCallback((update: LikeUpdate) => {
    setLikeStates((prev) => {
      const next = new Map(prev);
      const existing = prev.get(update.complaintId);
      
      // Only update 'liked' if it's explicitly provided in the update
      // This handles broadcast messages that only contain count updates
      const newLiked = update.liked !== undefined ? update.liked : (existing?.liked ?? false);
      
      next.set(update.complaintId, {
        liked: newLiked,
        count: update.count,
      });
      return next;
    });
    
    // Remove from pending
    setPendingLikes((prev) => {
      const next = new Set(prev);
      next.delete(update.complaintId);
      return next;
    });
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
    
    // Mark as pending
    setPendingLikes((prev) => new Set(prev).add(complaintId));
    
    // Optimistic update
    setLikeStates((prev) => {
      const next = new Map(prev);
      const current = prev.get(complaintId) || { liked: false, count: 0 };
      const newLiked = !current.liked;
      next.set(complaintId, {
        liked: newLiked,
        count: newLiked ? current.count + 1 : Math.max(0, current.count - 1),
      });
      return next;
    });
    
    // Send via WebSocket
    wsToggleLike(complaintId);
  }, [isAuthenticated, wsToggleLike]);

  // Initialize likes from API response (for initial load)
  const initializeLikes = useCallback((complaints: Array<{ id: string; upvoteCount: number; hasLiked?: boolean }>) => {
    setLikeStates((prev) => {
      const next = new Map(prev);
      for (const complaint of complaints) {
        const existing = next.get(complaint.id);
        // Always update count from API, but preserve liked state if we already have it
        // This ensures we get the latest count while not overriding optimistic updates
        if (existing) {
          // Keep existing liked state if count changed (optimistic update in progress)
          // Only update if API has more authoritative data
          next.set(complaint.id, {
            liked: existing.liked, // Preserve existing liked state
            count: complaint.upvoteCount, // Always use latest count from API
          });
        } else {
          // New complaint - use API values
          next.set(complaint.id, {
            liked: complaint.hasLiked ?? false,
            count: complaint.upvoteCount,
          });
        }
      }
      return next;
    });
  }, []);

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
