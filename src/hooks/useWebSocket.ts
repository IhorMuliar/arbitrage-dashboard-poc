'use client';

import React, { useState, useEffect, useRef, useCallback, createContext, useContext, ReactNode } from 'react';

export interface ArbitrageData {
  pairs: ArbitragePair[];
  metadata: {
    total_hyperliquid_pairs: number;
    positive_funding_pairs: number;
    bybit_available_pairs: number;
    last_update: string;
    update_interval_seconds: number;
    real_time_monitoring?: boolean;
    error?: string;
  };
}

export interface ArbitragePair {
  pair: string;
  hyperliquid_symbol: string;
  bybit_symbol: string;
  funding_rate: number;
  next_funding_time: number;
  hyperliquid: {
    bid: number;
    ask: number;
    bid_size: number;
    ask_size: number;
    volume: number;
  };
  bybit: {
    available: boolean;
    bid: number;
    ask: number;
    last: number;
    volume: number;
    volume_base: number;
  };
  annual_funding_rate: number;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  timestamp: string;
}

interface WebSocketContextType {
  data: ArbitrageData | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  reconnect: () => void;
}

// Create shared WebSocket context
const WebSocketContext = createContext<WebSocketContextType | null>(null);

// WebSocket Provider Component
export function WebSocketProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [data, setData] = useState<ArbitrageData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelayRef = useRef(1000);

  // Check if we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const connect = useCallback(() => {
    // Only connect on client side
    if (!isClient || typeof window === 'undefined') {
      return;
    }

    try {
      // Close existing connection
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      
      setIsLoading(true);
      setError(null);
      
      console.log('🔌 Creating SHARED WebSocket connection (60s updates)');
      ws.current = new WebSocket('ws://localhost:8765');
      
      ws.current.onopen = () => {
        console.log('✅ Shared WebSocket connected - 1 connection for all components');
        setIsConnected(true);
        setIsLoading(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        reconnectDelayRef.current = 1000;
        
        // Subscribe to data updates
        setTimeout(() => {
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
              type: 'subscribe_arbitrage_data'
            }));
            console.log('📡 Subscribed to data updates (1 minute intervals)');
          }
        }, 100);
      };
      
      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'arbitrage_data' && message.data) {
            console.log('📈 Shared: Received arbitrage data:', message.data.pairs?.length, 'pairs');
            setData(message.data);
            setIsLoading(false);
          } else if (message.type === 'connection') {
            console.log('🤝 Shared connection established:', message.message || 'Ready');
          } else if (message.type === 'pong') {
            // Keep connection alive - no logging needed
          } else {
            console.log('❓ Shared: Unknown message type:', message.type);
          }
        } catch (err) {
          console.error('❌ Shared: Error parsing WebSocket message:', err);
        }
      };
      
      ws.current.onclose = (event) => {
        console.log('🔌 Shared WebSocket disconnected. Code:', event.code);
        setIsConnected(false);
        
        // Attempt to reconnect if not a clean closure
        if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectDelayRef.current;
          console.log(`🔄 Shared: Reconnecting in ${delay}ms... (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            reconnectDelayRef.current = Math.min(delay * 2, 30000); // Max 30 seconds
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError('Failed to connect to WebSocket server after multiple attempts');
          setIsLoading(false);
        }
      };
      
      ws.current.onerror = (event) => {
        console.error('❌ Shared WebSocket error:', event);
        setError('WebSocket connection error');
        setIsLoading(false);
      };
      
    } catch (err) {
      console.error('❌ Shared: Error creating WebSocket connection:', err);
      setError('Failed to create WebSocket connection');
      setIsLoading(false);
      setIsConnected(false);
    }
  }, [isClient]);
  
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    reconnectDelayRef.current = 1000;
    connect();
  }, [connect]);
  
  // Send periodic ping to keep connection alive
  useEffect(() => {
    if (isConnected && ws.current && isClient) {
      const pingInterval = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000); // Ping every 30 seconds
      
      return () => clearInterval(pingInterval);
    }
  }, [isConnected, isClient]);
  
  // Connect on mount (client-side only)
  useEffect(() => {
    if (isClient) {
      console.log('🎯 WebSocketProvider: Initializing shared connection');
      connect();
    }
    
    return () => {
      if (isClient) {
        console.log('🔌 WebSocketProvider: Cleaning up shared connection');
        // Cleanup on unmount
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        if (ws.current) {
          ws.current.close();
        }
      }
    };
  }, [connect, isClient]);
  
  const value: WebSocketContextType = {
    data,
    isConnected,
    isLoading,
    error,
    reconnect
  };
  
  return React.createElement(WebSocketContext.Provider, { value }, children);
}

// Hook to use the shared WebSocket connection
export const useSharedWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useSharedWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Legacy hook for backward compatibility (now uses shared connection)
export const useWebSocket = (url: string): WebSocketContextType => {
  console.warn('⚠️ useWebSocket is deprecated. Use useSharedWebSocket instead for better performance.');
  return useSharedWebSocket();
}; 