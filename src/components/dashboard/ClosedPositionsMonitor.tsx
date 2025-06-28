'use client';

import { useState, useEffect } from 'react';
import { useTradingAPI, Position } from '../../hooks/useTradingAPI';

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

const formatDuration = (entryTime: string | null, exitTime: string | null) => {
  if (!entryTime || !exitTime) return 'N/A';
  
  const start = new Date(entryTime);
  const end = new Date(exitTime);
  const diffMs = end.getTime() - start.getTime();
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

export default function ClosedPositionsMonitor() {
  const { getClosedPositions } = useTradingAPI();
  const [closedPositions, setClosedPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(7);
  const [limit, setLimit] = useState<number>(20);

  const periodOptions = [
    { value: 1, label: 'Last 24 Hours' },
    { value: 3, label: 'Last 3 Days' },
    { value: 7, label: 'Last Week' },
    { value: 30, label: 'Last Month' },
    { value: 90, label: 'Last 3 Months' }
  ];

  // Fetch closed positions when period or limit changes
  useEffect(() => {
    const fetchClosedPositions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const positions = await getClosedPositions(selectedPeriod, limit);
        setClosedPositions(positions);
      } catch (err) {
        setError('Failed to load closed positions');
        console.error('Error fetching closed positions:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClosedPositions();
  }, [selectedPeriod, limit, getClosedPositions]);

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400';
    if (pnl < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  // Calculate summary statistics
  const totalPnL = closedPositions.reduce((sum, pos) => sum + pos.total.net_pnl, 0);
  const totalVolume = closedPositions.reduce((sum, pos) => sum + pos.usdt_amount, 0);
  const profitablePositions = closedPositions.filter(pos => pos.total.net_pnl > 0).length;
  const winRate = closedPositions.length > 0 ? (profitablePositions / closedPositions.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Closed Positions</h2>
          <div className="text-sm text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded">
            Loading...
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
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Closed Positions</h2>
        
        <div className="flex items-center gap-4">
          {/* Period selector */}
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
          
          {/* Limit selector */}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-3 py-1 bg-tertiary border border-white/10 rounded text-white text-sm focus:border-accent focus:outline-none"
          >
            <option value={10}>10 positions</option>
            <option value={20}>20 positions</option>
            <option value={50}>50 positions</option>
            <option value={100}>100 positions</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      {closedPositions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-center">
            <div className="text-sm text-text-secondary">Total P&L</div>
            <div className={`text-lg font-mono font-bold ${getPnLColor(totalPnL)}`}>
              {formatCurrency(totalPnL)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-text-secondary">Total Volume</div>
            <div className="text-lg font-mono font-bold text-white">
              {formatCurrency(totalVolume)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-text-secondary">Win Rate</div>
            <div className={`text-lg font-mono font-bold ${winRate >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
              {winRate.toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-text-secondary">Positions</div>
            <div className="text-lg font-mono font-bold text-white">
              {profitablePositions}/{closedPositions.length}
            </div>
          </div>
        </div>
      )}

      {/* Positions List */}
      {closedPositions.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📈</div>
          <h3 className="text-lg font-medium text-white mb-2">No Closed Positions</h3>
          <p className="text-text-secondary">
            Close some positions to see trading history here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {closedPositions.map((position, index) => {
            const pairName = formatPairName(position.symbol);
            const returnPct = (position.total.net_pnl / position.usdt_amount) * 100;
            
            return (
              <div key={`${position.symbol}-${index}`} className="bg-white/5 rounded-lg border border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-white">{pairName}</div>
                    <div className="px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                      CLOSED
                    </div>
                    <div className="text-sm text-text-secondary">
                      ${position.usdt_amount.toLocaleString()} USDT
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-lg font-mono font-bold ${getPnLColor(position.total.net_pnl)}`}>
                        {formatCurrency(position.total.net_pnl)}
                      </div>
                      <div className={`text-sm font-mono ${getPnLColor(returnPct)}`}>
                        {formatPercentage(returnPct)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                  {/* Entry & Exit */}
                  <div className="space-y-1">
                    <div className="text-text-secondary font-medium">Entry/Exit</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">HyperLiquid:</span>
                        <span className="text-white font-mono text-xs">
                          {formatCurrency(position.hyperliquid.entry_price)} → {formatCurrency(position.hyperliquid.exit_price)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Bybit:</span>
                        <span className="text-white font-mono text-xs">
                          {formatCurrency(position.bybit.entry_price)} → {formatCurrency(position.bybit.exit_price)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* P&L Breakdown */}
                  <div className="space-y-1">
                    <div className="text-text-secondary font-medium">P&L Breakdown</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">HyperLiquid:</span>
                        <span className={`font-mono text-xs ${getPnLColor(position.hyperliquid.realized_pnl)}`}>
                          {formatCurrency(position.hyperliquid.realized_pnl)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Bybit:</span>
                        <span className={`font-mono text-xs ${getPnLColor(position.bybit.realized_pnl)}`}>
                          {formatCurrency(position.bybit.realized_pnl)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Funding:</span>
                        <span className="text-green-400 font-mono text-xs">
                          {formatCurrency(position.total.funding_earned)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fees */}
                  <div className="space-y-1">
                    <div className="text-text-secondary font-medium">Fees</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">HyperLiquid:</span>
                        <span className="text-red-300 font-mono text-xs">
                          -{formatCurrency(position.hyperliquid.total_fees)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Bybit:</span>
                        <span className="text-red-300 font-mono text-xs">
                          -{formatCurrency(position.bybit.total_fees)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Total:</span>
                        <span className="text-red-300 font-mono text-xs font-bold">
                          -{formatCurrency(position.hyperliquid.total_fees + position.bybit.total_fees)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Risk Metrics */}
                  <div className="space-y-1">
                    <div className="text-text-secondary font-medium">Risk</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Leverage:</span>
                        <span className="text-white font-mono text-xs">{position.hyperliquid.leverage.toFixed(1)}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Funding Rate:</span>
                        <span className="text-green-400 font-mono text-xs">
                          {formatPercentage(position.entry_funding_rate * 100)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Duration:</span>
                        <span className="text-white font-mono text-xs">
                          {formatDuration(position.entry_time, position.exit_time)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timing */}
                  <div className="space-y-1">
                    <div className="text-text-secondary font-medium">Timing</div>
                    <div className="space-y-1">
                      <div className="text-xs">
                        <div className="text-text-secondary">Entry:</div>
                        <div className="text-white font-mono">
                          {position.entry_time ? new Date(position.entry_time).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-white font-mono">
                          {position.entry_time ? new Date(position.entry_time).toLocaleTimeString() : ''}
                        </div>
                      </div>
                      <div className="text-xs">
                        <div className="text-text-secondary">Exit:</div>
                        <div className="text-white font-mono">
                          {position.exit_time ? new Date(position.exit_time).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="text-white font-mono">
                          {position.exit_time ? new Date(position.exit_time).toLocaleTimeString() : ''}
                        </div>
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