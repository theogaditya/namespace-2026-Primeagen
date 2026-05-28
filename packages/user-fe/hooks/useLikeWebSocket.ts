"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Message types matching backend WsMessageType
export enum WsMessageType {
  AUTH = "auth",
  AUTH_SUCCESS = "auth_success",
  AUTH_ERROR = "auth_error",
  LIKE = "like",
  LIKE_UPDATE = "like_update",
  LIKE_ERROR = "like_error",
  SUBSCRIBE = "subscribe",
  UNSUBSCRIBE = "unsubscribe",
  SUBSCRIBED = "subscribed",
  UNSUBSCRIBED = "unsubscribed",
  PING = "ping",
  PONG = "pong",
  ERROR = "error",
}

export interface WsMessage {
  type: WsMessageType | string;
  payload?: Record<string, unknown>;
  timestamp?: number;
}

export interface LikeUpdate {
  complaintId: string;
  liked: boolean;
  count: number;
  userId?: string;
}

export interface UseLikeWebSocketOptions {
  authToken: string | null;
  wsUrl?: string;
  onLikeUpdate?: (update: LikeUpdate) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export interface UseLikeWebSocketReturn {
  isConnected: boolean;
  isAuthenticated: boolean;
  toggleLike: (complaintId: string) => void;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
}

const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";
const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 30000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

export function useLikeWebSocket({
  authToken,
  wsUrl = DEFAULT_WS_URL,
  onLikeUpdate,
  onConnect,
  onDisconnect,
  onError,
}: UseLikeWebSocketOptions): UseLikeWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Use refs to store mutable values without causing re-renders
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountedRef = useRef(false);
  const isConnectingRef = useRef(false);
  
  // Store callbacks in refs to avoid dependency issues
  const callbacksRef = useRef({ onLikeUpdate, onConnect, onDisconnect, onError });
  callbacksRef.current = { onLikeUpdate, onConnect, onDisconnect, onError };
  
  // Store authToken in ref for stable access
  const authTokenRef = useRef(authToken);
  authTokenRef.current = authToken;

  // Cleanup helper
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // Send message helper
  const sendMessage = useCallback((type: WsMessageType, payload?: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
  }, []);

  // Connect function - only depends on wsUrl which is stable
  const connect = useCallback(() => {
    // Guards
    if (isUnmountedRef.current) return;
    if (!authTokenRef.current) return;
    if (isConnectingRef.current) return;
    
    const ws = wsRef.current;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    
    isConnectingRef.current = true;
    cleanup();
    
    // Close existing connection if any
    if (ws) {
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      wsRef.current = null;
    }
    
    console.log("🔌 Connecting to WebSocket...");
    
    try {
      const newWs = new WebSocket(wsUrl);
      wsRef.current = newWs;
      
      newWs.onopen = () => {
        isConnectingRef.current = false;
        
        if (isUnmountedRef.current) {
          newWs.close(1000, "Component unmounted");
          return;
        }
        
        console.log("🔌 WebSocket connected");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        callbacksRef.current.onConnect?.();
        
        // Send auth
        const token = authTokenRef.current;
        if (token) {
          newWs.send(JSON.stringify({
            type: WsMessageType.AUTH,
            payload: { token },
            timestamp: Date.now(),
          }));
        }
        
        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (newWs.readyState === WebSocket.OPEN) {
            newWs.send(JSON.stringify({ type: WsMessageType.PING, timestamp: Date.now() }));
          }
        }, PING_INTERVAL);
      };
      
      newWs.onmessage = (event: MessageEvent) => {
        try {
          const message: WsMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case WsMessageType.AUTH_SUCCESS:
              setIsAuthenticated(true);
              reconnectAttemptsRef.current = 0;
              console.log("✅ WebSocket authenticated");
              break;
              
            case WsMessageType.AUTH_ERROR:
              setIsAuthenticated(false);
              console.error("❌ WebSocket auth failed:", message.payload?.error);
              break;
              
            case WsMessageType.LIKE_UPDATE:
              if (message.payload) {
                callbacksRef.current.onLikeUpdate?.({
                  complaintId: message.payload.complaintId as string,
                  liked: message.payload.liked as boolean,
                  count: message.payload.count as number,
                  userId: message.payload.userId as string | undefined,
                });
              }
              break;
              
            case WsMessageType.PONG:
              // Heartbeat OK
              break;
              
            case WsMessageType.LIKE_ERROR:
            case WsMessageType.ERROR:
              console.error("WebSocket message error:", message.payload?.error);
              break;
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };
      
      newWs.onclose = (event) => {
        isConnectingRef.current = false;
        console.log(`🔌 WebSocket disconnected: ${event.code} - ${event.reason || "(no reason)"}`);
        
        cleanup();
        wsRef.current = null;
        setIsConnected(false);
        setIsAuthenticated(false);
        callbacksRef.current.onDisconnect?.();
        
        // Reconnect only if not intentionally closed and component still mounted
        const shouldReconnect = 
          !isUnmountedRef.current &&
          authTokenRef.current &&
          event.code !== 1000 && // Normal closure
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS;
        
        if (shouldReconnect) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Reconnecting in ${RECONNECT_DELAY}ms (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
        }
      };
      
      newWs.onerror = (error) => {
        isConnectingRef.current = false;
        console.error("WebSocket error:", error);
        callbacksRef.current.onError?.(error);
      };
      
    } catch (error) {
      isConnectingRef.current = false;
      console.error("Failed to create WebSocket:", error);
    }
  }, [wsUrl, cleanup]); // Only depends on stable values

  // Disconnect function
  const disconnect = useCallback(() => {
    cleanup();
    
    const ws = wsRef.current;
    if (ws) {
      // Prevent reconnect by setting onclose to null before closing
      ws.onclose = null;
      ws.close(1000, "Intentional disconnect");
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsAuthenticated(false);
  }, [cleanup]);

  // Actions
  const toggleLike = useCallback((complaintId: string) => {
    if (!isAuthenticated) {
      console.warn("Cannot like: not authenticated");
      return;
    }
    sendMessage(WsMessageType.LIKE, { complaintId });
  }, [isAuthenticated, sendMessage]);

  const subscribe = useCallback((topic: string) => {
    sendMessage(WsMessageType.SUBSCRIBE, { topic });
  }, [sendMessage]);

  const unsubscribe = useCallback((topic: string) => {
    sendMessage(WsMessageType.UNSUBSCRIBE, { topic });
  }, [sendMessage]);

  // Effect: Connect when authToken is available
  // IMPORTANT: Only depend on authToken to avoid reconnect loops
  useEffect(() => {
    isUnmountedRef.current = false;
    
    if (authToken) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(connect, 50);
      return () => {
        clearTimeout(timer);
        isUnmountedRef.current = true;
        disconnect();
      };
    }
    
    return () => {
      isUnmountedRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]); // Intentionally only depend on authToken

  return {
    isConnected,
    isAuthenticated,
    toggleLike,
    subscribe,
    unsubscribe,
  };
}
