'use client';

import { useState, useEffect } from 'react';
import { useSharedWebSocket } from '../../hooks/useWebSocket';
import { useTradingAPI, Position } from '../../hooks/useTradingAPI';

interface ActivePositionsMonitorProps {
  positions?: any[]; // Keep for backward compatibility but will use real data
  onClosePosition?: (positionId: string) => void;
  onModifyPosition?: (positionId: string) => void;
}

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

export default function ActivePositionsMonitor({ onClosePosition, onModifyPosition }: ActivePositionsMonitorProps) {
  const { activePositions, isConnected, error: wsError } = useSharedWebSocket();
  const { closePosition } = useTradingAPI();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closingPositions, setClosingPositions] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update loading state when WebSocket connects and positions are received
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

  const handleClosePosition = async (position: Position) => {
    const positionKey = position.symbol;
    
    try {
      setClosingPositions(prev => new Set(prev).add(positionKey));
      
      const result = await closePosition(position.symbol, 100);
      
      if (result.success) {
        // Position will be automatically removed from activePositions via WebSocket update
        
        // Call original callback if provided
        if (onClosePosition) {
          onClosePosition(positionKey);
        }
        
        console.log('✅ Position closed successfully:', result.message);
      } else {
        setError(result.error || result.message);
        console.error('❌ Failed to close position:', result.error || result.message);
      }
    } catch (err) {
      setError('Failed to close position');
      console.error('Error closing position:', err);
    } finally {
      setClosingPositions(prev => {
        const newSet = new Set(prev);
        newSet.delete(positionKey);
        return newSet;
      });
    }
  };

  const getRiskColor = (riskPct: number) => {
    if (riskPct < 5) return 'text-red-400';
    if (riskPct < 15) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400';
    if (pnl < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  if (!isConnected) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Active Positions</h2>
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
          <h2 className="text-xl font-bold text-white">Active Positions</h2>
          <div className="text-sm text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded">
            Loading positions...
          </div>
        </div>
        <div className="text-center py-8 text-text-secondary">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Fetching active positions...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Active Positions</h2>
          <div className="text-sm text-red-400 bg-red-400/10 px-3 py-1 rounded">
            Error loading positions
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Failed to Load Positions</span>
          </div>
          <p className="text-red-300 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (activePositions.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">Active Positions</h2>
            <div className="flex items-center gap-2 text-green-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">💼 Live Updates</span>
            </div>
            <div className={`text-xs bg-success/10 px-2 py-1 rounded transition-all duration-300 ${
              isRefreshing ? 'text-cyan-400 bg-cyan-400/20' : 'text-success'
            }`}>
              {isRefreshing ? (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Refreshing positions...</span>
                </div>
              ) : (
                <span>🔄 Auto-refresh every 15s</span>
              )}
            </div>
          </div>
          
          <div className="text-sm text-text-secondary bg-white/5 px-3 py-1 rounded">
            {activePositions.length} positions
          </div>
        </div>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💼</div>
          <h3 className="text-lg font-medium text-white mb-2">No Active Positions</h3>
          <p className="text-text-secondary">
            Execute your first arbitrage trade to see positions here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Active Positions</h2>
          <div className="flex items-center gap-2 text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">💼 Live Updates</span>
          </div>
          <div className={`text-xs bg-success/10 px-2 py-1 rounded transition-all duration-300 ${
            isRefreshing ? 'text-cyan-400 bg-cyan-400/20' : 'text-success'
          }`}>
            {isRefreshing ? (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Refreshing positions...</span>
              </div>
            ) : (
              <span>🔄 Auto-refresh every 15s</span>
            )}
          </div>
        </div>
        
        <div className="text-sm text-text-secondary bg-white/5 px-3 py-1 rounded">
          {activePositions.length} active position{activePositions.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-4">
        {activePositions.map((position) => {
          const isClosing = closingPositions.has(position.symbol);
          const pairName = formatPairName(position.symbol);
          
          return (
            <div key={position.symbol} className="bg-white/5 rounded-lg border border-white/10 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold text-white">{pairName}</div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    position.status === 'active' 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {position.status.toUpperCase()}
                  </div>
                  <div className="text-sm text-text-secondary">
                    ${position.usdt_amount.toLocaleString()} USDT
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onModifyPosition && onModifyPosition(position.symbol)}
                    className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                  >
                    Modify
                  </button>
                  <button
                    onClick={() => handleClosePosition(position)}
                    disabled={isClosing}
                    className="px-3 py-1 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {isClosing ? (
                      <>
                        <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"></div>
                        Closing...
                      </>
                    ) : (
                      'Close'
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                {/* HyperLiquid Side */}
                <div className="space-y-2">
                  <div className="text-cyan-400 font-medium">HyperLiquid (Short)</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Entry:</span>
                      <span className="text-white font-mono">{formatCurrency(position.hyperliquid.entry_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Size:</span>
                      <span className="text-white font-mono">{position.hyperliquid.size.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">PnL:</span>
                      <span className={`font-mono font-bold ${getPnLColor(position.hyperliquid.unrealized_pnl)}`}>
                        {formatCurrency(position.hyperliquid.unrealized_pnl)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bybit Side */}
                <div className="space-y-2">
                  <div className="text-orange-400 font-medium">Bybit (Long)</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Entry:</span>
                      <span className="text-white font-mono">{formatCurrency(position.bybit.entry_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Amount:</span>
                      <span className="text-white font-mono">{position.bybit.amount.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">PnL:</span>
                      <span className={`font-mono font-bold ${getPnLColor(position.bybit.unrealized_pnl)}`}>
                        {formatCurrency(position.bybit.unrealized_pnl)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Combined Metrics */}
                <div className="space-y-2">
                  <div className="text-white font-medium">Combined</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Total PnL:</span>
                      <span className={`font-mono font-bold ${getPnLColor(position.total.net_pnl)}`}>
                        {formatCurrency(position.total.net_pnl)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Funding:</span>
                      <span className="text-green-400 font-mono">
                        {formatCurrency(position.total.funding_earned)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Return:</span>
                      <span className={`font-mono font-bold ${getPnLColor(position.total.net_pnl)}`}>
                        {formatPercentage((position.total.net_pnl / position.usdt_amount) * 100)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Risk Metrics */}
                <div className="space-y-2">
                  <div className="text-white font-medium">Risk</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Liq. Risk:</span>
                      <span className={`font-mono ${getRiskColor(position.hyperliquid.liquidation_risk_pct)}`}>
                        {position.hyperliquid.liquidation_risk_pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Leverage:</span>
                      <span className="text-white font-mono">{position.hyperliquid.leverage.toFixed(1)}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Funding Rate:</span>
                      <span className="text-green-400 font-mono">
                        {formatPercentage(position.entry_funding_rate * 100)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time and Status */}
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-text-secondary">
                <div>
                  Entry Time: {position.entry_time ? new Date(position.entry_time).toLocaleString() : 'N/A'}
                </div>
                <div>
                  Duration: {position.entry_time ? 
                    Math.floor((Date.now() - new Date(position.entry_time).getTime()) / (1000 * 60 * 60)) + 'h' : 
                    'N/A'
                  }
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 