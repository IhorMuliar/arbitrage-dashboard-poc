import { useState, useEffect, useRef, useCallback } from 'react';

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

export interface MarketData {
  hyperliquid: Record<string, any>;
  bybit: Record<string, any>;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: string;
}

interface UseWebSocketReturn {
  data: ArbitrageData | null;
  marketData: MarketData | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  reconnect: () => void;
}

export const useWebSocket = (url: string): UseWebSocketReturn => {
  const [data, setData] = useState<ArbitrageData | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelayRef = useRef(1000);
  
  const connect = useCallback(() => {
    try {
      // Close existing connection
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      
      setIsLoading(true);
      setError(null);
      
      console.log('🔌 Attempting WebSocket connection to:', url);
      ws.current = new WebSocket(url);
      
      ws.current.onopen = () => {
        console.log('✅ WebSocket connected to:', url);
        setIsConnected(true);
        setIsLoading(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        reconnectDelayRef.current = 1000;
        
        // Subscribe to arbitrage data with a small delay
        setTimeout(() => {
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
              type: 'subscribe_arbitrage_data'
            }));
            console.log('📡 Subscribed to arbitrage data');
          }
        }, 100);
      };
      
      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 Received WebSocket message type:', message.type);
          
          if (message.type === 'arbitrage_data' && message.data) {
            console.log('📈 Received arbitrage data:', message.data);
            setData(message.data);
            setIsLoading(false);
          } else if (message.type === 'market_data' && message.data) {
            console.log('🏪 Received market data:', message.data);
            setMarketData(message.data);
          } else if (message.type === 'connection') {
            console.log('🤝 Connection message:', message);
          } else if (message.type === 'pong') {
            // Handle ping-pong for connection health
            console.log('🏓 Received pong from server');
          } else {
            console.log('❓ Unknown message type:', message.type, message);
          }
        } catch (err) {
          console.error('❌ Error parsing WebSocket message:', err);
        }
      };
      
      ws.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect if not a clean closure
        if (!event.wasClean && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectDelayRef.current;
          console.log(`🔄 Attempting to reconnect in ${delay}ms... (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
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
        console.error('❌ WebSocket error:', event);
        setError('WebSocket connection error');
        setIsLoading(false);
      };
      
    } catch (err) {
      console.error('❌ Error creating WebSocket connection:', err);
      setError('Failed to create WebSocket connection');
      setIsLoading(false);
      setIsConnected(false);
    }
  }, [url]);
  
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    reconnectDelayRef.current = 1000;
    connect();
  }, [connect]);
  
  // Send periodic ping to keep connection alive
  useEffect(() => {
    if (isConnected && ws.current) {
      const pingInterval = setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000); // Ping every 30 seconds
      
      return () => clearInterval(pingInterval);
    }
  }, [isConnected]);
  
  // Connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);
  
  return {
    data,
    marketData,
    isConnected,
    isLoading,
    error,
    reconnect
  };
}; 