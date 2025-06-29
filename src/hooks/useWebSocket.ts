/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import React, { useState, useEffect, useRef, useCallback, createContext, useContext, ReactNode } from 'react';
import { endpoints } from '../config/endpoints';

export interface ArbitragePair {
  pair: string;
  funding_rate: number;
  annual_funding_rate: number;
  hyperliquid: {
    bid: number;
    ask: number;
    volume: number;
    bid_size?: number;
    ask_size?: number;
  };
  bybit: {
    bid: number;
    ask: number;
    volume: number;
    available: boolean;
  };
}

export interface ArbitrageData {
  pairs: ArbitragePair[];
  metadata: {
    last_update: string;
    hyperliquid_pairs_count: number;
    bybit_pairs_count: number;
    combined_pairs_count: number;
  };
}

export interface Position {
  symbol: string;
  usdt_amount: number;
  status: string;
  entry_time: string | null;
  exit_time: string | null;
  entry_funding_rate: number;
  bybit: {
    entry_price: number;
    exit_price: number;
    amount: number;
    unrealized_pnl: number;
    realized_pnl: number;
    total_fees: number;
  };
  hyperliquid: {
    entry_price: number;
    exit_price: number;
    size: number;
    unrealized_pnl: number;
    realized_pnl: number;
    liquidation_price: number;
    margin_used: number;
    leverage: number;
    total_fees: number;
    liquidation_risk_pct: number;
  };
  total: {
    unrealized_pnl: number;
    realized_pnl: number;
    funding_earned: number;
    net_pnl: number;
  };
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  timestamp: string;
}

interface AccountBalances {
  bybit: {
    total: number;
    free: number;
    used: number;
  };
  hyperliquid: {
    total: number;
    free: number;
    used: number;
  };
}

interface WebSocketContextType {
  data: ArbitrageData | null;
  activePositions: Position[];
  closedPositions: any[]; // Can be Position[] or TradeData[] depending on backend
  balances: AccountBalances | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ArbitrageData | null>(null);
  const [activePositions, setActivePositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<any[]>([]); // Generic array for flexibility
  const [balances, setBalances] = useState<AccountBalances | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnecting = useRef(false);
  const hasInitialFetched = useRef(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const connect = useCallback(() => {
    if (!isClient || isReconnecting.current) return;

    try {
      ws.current = new WebSocket(endpoints.ws.base);
      
      ws.current.onopen = async () => {
        console.log('✅ Shared: WebSocket connection established');
        setIsConnected(true);
        setError(null);
        isReconnecting.current = false;
        
        // Make single initial API fetch if not already done
        if (!hasInitialFetched.current) {
          console.log('🔄 Making initial API fetch...');
          hasInitialFetched.current = true;
          
          try {
            const response = await fetch(`${endpoints.api.base}${endpoints.api.positions}/fetch`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                days: 7
              })
            });

            if (response.ok) {
              const result = await response.json();
              console.log('✅ Initial API fetch successful');
              
              // Set the fetched data immediately
              if (result.data) {
                setActivePositions(result.data.active_positions || []);
                setClosedPositions(result.data.closed_positions || []);
                console.log(`📊 Loaded ${result.data.active_positions?.length || 0} active positions`);
                console.log(`📄 Loaded ${result.data.closed_positions?.length || 0} closed positions`);
                console.log('📊 DEBUG: Initial active positions:', result.data.active_positions);
              }
            } else {
              console.error('❌ Initial API fetch failed:', response.status);
            }
          } catch (err) {
            console.error('❌ Error in initial API fetch:', err);
          }
        }
        
        // Send subscription requests after connection is established
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          // Subscribe to arbitrage data
          ws.current.send(JSON.stringify({
            type: 'subscribe_arbitrage_data'
          }));
          
          // Request active positions (for real-time updates)
          ws.current.send(JSON.stringify({
            type: 'get_active_positions'
          }));
          
          // Request closed positions (for real-time updates)
          ws.current.send(JSON.stringify({
            type: 'get_closed_positions',
            days: 7
            // Remove limit to get ALL trades from last 7 days
          }));
          
          // Request account balances
          ws.current.send(JSON.stringify({
            type: 'get_account_balances'
          }));
          
          console.log('📡 Shared: Sent subscription requests for real-time updates');
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'arbitrage_data') {
            console.log('📈 Shared: Received arbitrage data with', message.data.pairs?.length, 'pairs');
            setData(message.data);
            setIsLoading(false); // Data received, no longer loading
          } else if (message.type === 'active_positions') {
            console.log('📊 Shared: Received active positions with', message.data.active_positions?.length, 'positions');
            console.log('📊 DEBUG: Active positions data:', message.data);
            setActivePositions(message.data.active_positions || []);
          } else if (message.type === 'closed_positions') {
            console.log('📄 Shared: Received closed positions with', message.data.closed_positions?.length, 'positions');
            setClosedPositions(message.data.closed_positions || []);
          } else if (message.type === 'account_balances') {
            console.log('💰 Shared: Received account balances');
            console.log('💰 DEBUG: Account balances data:', message.data);
            setBalances(message.data.balances || null);
          } else if (message.type === 'connection') {
            console.log('🤝 Shared connection established:', message.message || 'Ready');
          } else if (message.type === 'error') {
            console.error('❌ Shared: WebSocket error:', message.message);
            setError(message.message);
          }
        } catch (err) {
          console.error('❌ Shared: Error parsing WebSocket message:', err);
          setError('Failed to parse WebSocket message');
        }
      };

      ws.current.onclose = (event) => {
        console.log('🔌 Shared: WebSocket connection closed', event.code, event.reason);
        setIsConnected(false);
        
        if (!isReconnecting.current && event.code !== 1000) {
          isReconnecting.current = true;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Shared: Attempting to reconnect...');
            connect();
          }, 3000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('❌ Shared: WebSocket error:', error);
        setError('WebSocket connection failed');
        setIsConnected(false);
      };

    } catch (err) {
      console.error('❌ Shared: Failed to create WebSocket:', err);
      setError('Failed to create WebSocket connection');
    }
  }, [isClient]);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (ws.current) {
      ws.current.close();
    }
    
    isReconnecting.current = false;
    connect();
  }, [connect]);

  useEffect(() => {
    if (isClient) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (ws.current) {
        isReconnecting.current = true;
        ws.current.close(1000, 'Component unmounting');
      }
    };
  }, [isClient, connect]);

  const value: WebSocketContextType = {
    data,
    activePositions,
    closedPositions,
    balances,
    isConnected,
    isLoading,
    error,
    reconnect
  };

  return React.createElement(WebSocketContext.Provider, { value }, children);
}

export function useWebSocketContext(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

export function useWebSocket(): WebSocketContextType {
  console.warn('⚠️ useWebSocket is deprecated. Use useSharedWebSocket instead for better performance.');
  return useSharedWebSocket();
}

// Simplified shared WebSocket hook
export const useSharedWebSocket = (): WebSocketContextType => {
  return useWebSocketContext();
}; 