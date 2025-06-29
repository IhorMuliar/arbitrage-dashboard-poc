/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback } from 'react';
import { endpoints } from '../config/endpoints';

// API base URL - in production this would come from environment variables
const API_BASE_URL = endpoints.api.base;

export interface TradingResult {
  success: boolean;
  message: string;
  error?: string;
  position?: any;
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

// Trading API functions
const executeTradeAPI = async (pair: string, amount: number): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/trading/open`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pair, amount }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

const closeTradeAPI = async (pair: string, percentage: number = 100): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/trading/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        pair,
        percentage 
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || `Failed to close position (${response.status})`);
    }
    
    return data;
  } catch (error: any) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to close position: Network error');
  }
};

const getActivePositionsAPI = async (): Promise<Position[]> => {
  const response = await fetch(`${API_BASE_URL}/trading/positions/active`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  return data.active_positions || [];
};

const getClosedPositionsAPI = async (days: number = 7, limit: number = 50): Promise<Position[]> => {
  const response = await fetch(`${API_BASE_URL}/trading/positions/closed?days=${days}&limit=${limit}`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  return data.closed_positions || [];
};

const getTradingStatusAPI = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/trading/status`);
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

export const useTradingAPI = () => {
  const openPosition = useCallback(async (pair: string, amount: number): Promise<TradingResult> => {
    try {
      const result = await executeTradeAPI(pair, amount);
      return { 
        success: true, 
        message: result.message || 'Position opened successfully',
        position: result.position 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: 'Failed to open position', 
        error: error.message 
      };
    }
  }, []);

  const closePosition = useCallback(async (pair: string, percentage: number = 100): Promise<TradingResult> => {
    try {
      const result = await closeTradeAPI(pair, percentage);
      return { 
        success: true, 
        message: result.message || 'Position closed successfully' 
      };
    } catch (error: any) {
      return { 
        success: false, 
        message: 'Failed to close position', 
        error: error.message 
      };
    }
  }, []);

  const getActivePositions = useCallback(async (): Promise<Position[]> => {
    try {
      return await getActivePositionsAPI();
    } catch (error) {
      console.error('Failed to get active positions:', error);
      return [];
    }
  }, []);

  const getClosedPositions = useCallback(async (days: number = 7, limit: number = 50): Promise<Position[]> => {
    try {
      return await getClosedPositionsAPI(days, limit);
    } catch (error) {
      console.error('Failed to get closed positions:', error);
      return [];
    }
  }, []);

  const getTradingStatus = useCallback(async (): Promise<any> => {
    try {
      return await getTradingStatusAPI();
    } catch (error) {
      console.error('Failed to get trading status:', error);
      return null;
    }
  }, []);

  return {
    openPosition,
    closePosition,
    getActivePositions,
    getClosedPositions,
    getTradingStatus
  };
}; 