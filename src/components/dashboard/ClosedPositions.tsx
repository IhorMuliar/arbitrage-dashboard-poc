'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSharedWebSocket } from '../../hooks/useWebSocket';
import type { Position } from '../../hooks/useWebSocket';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(value);
};

const formatPercentage = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(3)}%`;
};

const formatPairName = (pair: string) => {
  return pair.replace('/USDT', '').replace('-USD', '');
};

export default function ClosedPositions() {
  const { closedPositions, isConnected, error: wsError } = useSharedWebSocket();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(7);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const periodOptions = [
    { value: 1, label: 'Last 24 Hours' },
    { value: 3, label: 'Last 3 Days' },
    { value: 7, label: 'Last Week' },
    { value: 30, label: 'Last Month' }
  ];

  // Update loading state when WebSocket connects
  useEffect(() => {
    if (isConnected) {
      setIsLoading(false);
      setError(wsError);
    } else {
      setIsLoading(true);
      setError(null);
    }
  }, [isConnected, wsError]);

  // Simulate periodic refresh indicator
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(() => {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 1000); // Show for 1 second
    }, 15000); // Every 15 seconds
    
    return () => clearInterval(interval);
  }, [isConnected]);

  // Filter positions based on selected period (client-side filtering)
  const filteredPositions = useMemo(() => {
    if (!closedPositions || closedPositions.length === 0) return [];
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - selectedPeriod);
    
    return closedPositions.filter(position => {
      if (!position.exit_time) return false;
      const exitDate = new Date(position.exit_time);
      return exitDate >= cutoffDate;
    });
  }, [closedPositions, selectedPeriod]);

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400';
    if (pnl < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  if (!isConnected) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Closed Positions</h2>
          <div className="text-sm text-warning bg-warning/10 px-3 py-1 rounded">
            Establishing connection...
          </div>
        </div>
        <div className="text-center py-8 text-text-secondary">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Establishing connection...
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Closed Positions</h2>
          <div className="text-sm text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded">
            Loading positions...
          </div>
        </div>
        <div className="text-center py-8 text-text-secondary">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Fetching closed positions...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Closed Positions</h2>
          <div className="text-sm text-red-400 bg-red-400/10 px-3 py-1 rounded">
            Error
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Failed to Load Closed Positions</span>
          </div>
          <p className="text-red-300 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Closed Positions</h2>
          <div className="flex items-center gap-2 text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">📋 Live Updates</span>
          </div>
                     <div className={`text-xs bg-success/10 px-2 py-1 rounded transition-all duration-300 ${
             isRefreshing ? 'text-cyan-400 bg-cyan-400/20' : 'text-success'
           }`}>
             {isRefreshing ? (
               <div className="flex items-center gap-1">
                 <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                 <span>Refreshing history...</span>
               </div>
             ) : (
               <span>🔄 Auto-refresh every 15s</span>
             )}
           </div>
        </div>
        
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(Number(e.target.value))}
          className="px-3 py-1 bg-tertiary border border-white/10 rounded text-white text-sm focus:border-accent focus:outline-none"
        >
          {periodOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {filteredPositions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-white mb-2">No Closed Positions</h3>
          <p className="text-text-secondary">
            Close some positions to see trading history here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPositions.map((position, index) => {
            const pairName = formatPairName(position.symbol);
            const returnPct = (position.total.net_pnl / position.usdt_amount) * 100;
            
            return (
              <div key={`${position.symbol}-${index}`} className="bg-white/5 rounded-lg border border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-white">{pairName}</div>
                    <div className="px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
                      CLOSED
                    </div>
                    <div className="text-sm text-text-secondary">
                      ${position.usdt_amount.toLocaleString()} USDT
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-lg font-mono font-bold ${getPnLColor(position.total.net_pnl)}`}>
                      {formatCurrency(position.total.net_pnl)}
                    </div>
                    <div className={`text-sm font-mono ${getPnLColor(returnPct)}`}>
                      {formatPercentage(returnPct)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="text-text-secondary font-medium">HyperLiquid</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Entry:</span>
                        <span className="text-white font-mono">{formatCurrency(position.hyperliquid.entry_price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">PnL:</span>
                        <span className={`font-mono ${getPnLColor(position.hyperliquid.realized_pnl)}`}>
                          {formatCurrency(position.hyperliquid.realized_pnl)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-text-secondary font-medium">Bybit</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Entry:</span>
                        <span className="text-white font-mono">{formatCurrency(position.bybit.entry_price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">PnL:</span>
                        <span className={`font-mono ${getPnLColor(position.bybit.realized_pnl)}`}>
                          {formatCurrency(position.bybit.realized_pnl)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-text-secondary font-medium">Summary</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Funding:</span>
                        <span className="text-green-400 font-mono">
                          {formatCurrency(position.total.funding_earned)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Duration:</span>
                        <span className="text-white font-mono text-xs">
                          {position.entry_time && position.exit_time ? 
                            Math.floor((new Date(position.exit_time).getTime() - new Date(position.entry_time).getTime()) / (1000 * 60 * 60)) + 'h' : 
                            'N/A'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 