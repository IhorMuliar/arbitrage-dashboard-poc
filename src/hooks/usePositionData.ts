'use client';

import { useState, useCallback } from 'react';

export interface PositionDataResponse {
  success: boolean;
  message: string;
  data: {
    closed_positions: any[];
    active_positions: any[];
    breakdown: {
      bybit: {
        count: number;
        trades: any[];
      };
      hyperliquid: {
        count: number;
        trades: any[];
      };
    };
    filter: {
      days: number;
      limit: number;
    };
    timestamp: number;
  };
}

export function usePositionData() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInitialData = useCallback(async (days: number, limit: number = 50): Promise<PositionDataResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate days parameter (only allow 1, 3, 7)
      if (![1, 3, 7].includes(days)) {
        throw new Error('Days must be 1, 3, or 7');
      }

      const response = await fetch('http://localhost:8080/api/positions/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          days,
          limit
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: PositionDataResponse = await response.json();
      
      console.log(`✅ Fetched initial data: ${data.data.closed_positions.length} trades, ${data.data.active_positions.length} positions`);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch initial data';
      setError(errorMessage);
      console.error('❌ Error fetching initial data:', errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchHistoricalTrades = useCallback(async (days: number, limit: number = 50) => {
    try {
      const response = await fetch(`http://localhost:8080/api/positions/closed?days=${days}&limit=${limit}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch historical trades';
      console.error('❌ Error fetching historical trades:', errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const fetchActivePositions = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8080/api/positions/active');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch active positions';
      console.error('❌ Error fetching active positions:', errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  return {
    isLoading,
    error,
    fetchInitialData,
    fetchHistoricalTrades,
    fetchActivePositions
  };
} 