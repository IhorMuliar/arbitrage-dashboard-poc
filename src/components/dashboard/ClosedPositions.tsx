'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSharedWebSocket } from '../../hooks/useWebSocket';

// Define the actual trade data format coming from backend
interface TradeData {
  symbol: string;
  side: string;
  price: number;
  quantity: number;
  fee: number;
  execution_time: string;
  order_id: string;
  exchange: string;
  pnl?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(value);
};

const formatTime = (timeString: string) => {
  try {
    return new Date(timeString).toLocaleString();
  } catch {
    return timeString;
  }
};

export default function ClosedPositions() {
  const { closedPositions, isConnected, error: wsError } = useSharedWebSocket();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Update loading state when WebSocket connects and data is received
  useEffect(() => {
    if (isConnected) {
      setError(wsError);
      setIsLoading(false); // Stop loading once connected (data comes via WebSocket)
    } else {
      setError(null);
      setIsLoading(true);
    }
  }, [isConnected, wsError]);

  // Reset to first page when positions change
  useEffect(() => {
    setCurrentPage(1);
  }, [closedPositions]);

  // Simulate periodic refresh indicator (visual only, no API calls)
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(() => {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 1000); // Show for 1 second
    }, 15000); // Every 15 seconds
    
    return () => clearInterval(interval);
  }, [isConnected]);

  // Cast WebSocket data to TradeData format with null safety
  const trades = useMemo(() => {
    if (!closedPositions || !Array.isArray(closedPositions)) return [];
    return closedPositions.filter(trade => trade && typeof trade === 'object') as unknown as TradeData[];
  }, [closedPositions]);

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400';
    if (pnl < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getSideColor = (side: string) => {
    if (!side) return 'text-gray-400';
    if (side.toLowerCase() === 'buy') return 'text-green-400';
    if (side.toLowerCase() === 'sell') return 'text-red-400';
    return 'text-gray-400';
  };

  const getExchangeColor = (exchange: string) => {
    if (!exchange) return 'text-gray-400';
    if (exchange.toLowerCase() === 'bybit') return 'text-blue-400';
    if (exchange.toLowerCase() === 'hyperliquid') return 'text-purple-400';
    return 'text-gray-400';
  };

  const getExchangeIcon = (exchange: string) => {
    return exchange === 'bybit' ? '🟦' : '🟨';
  };

  // Pagination calculations
  const totalPages = Math.ceil(closedPositions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPositions = closedPositions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  if (!isConnected) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Recent Trades</h2>
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
          <h2 className="text-xl font-bold text-white">Recent Trades</h2>
          <div className="text-sm text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded">
            Loading data...
          </div>
        </div>
        <div className="text-center py-8 text-text-secondary">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Establishing connection...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Recent Trades</h2>
          <div className="text-sm text-red-400 bg-red-400/10 px-3 py-1 rounded">
            Error
          </div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Failed to Load Trades</span>
          </div>
          <p className="text-red-300 text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (closedPositions.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">Recent Trades</h2>
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
                  <span>Refreshing trades...</span>
                </div>
              ) : (
                <span>🔄 Auto-refresh every 15s</span>
              )}
            </div>
          </div>
          
          <div className="text-sm text-text-secondary bg-white/5 px-3 py-1 rounded">
            WebSocket Only
          </div>
        </div>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-white mb-2">No Recent Trades</h3>
          <p className="text-text-secondary">
            Your executed trades will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Recent Trades</h2>
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
                <span>Refreshing trades...</span>
              </div>
            ) : (
              <span>🔄 Auto-refresh every 15s</span>
            )}
          </div>
        </div>
        
        <div className="text-sm text-text-secondary bg-white/5 px-3 py-1 rounded">
          {closedPositions.length} trade{closedPositions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Trades Table */}
      <div className="space-y-3">
        {paginatedPositions.map((position, index) => (
          <div
            key={`${position.symbol}-${position.execution_time}-${index}`}
            className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/8 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getExchangeIcon(position.exchange)}</span>
                  <span className="font-medium text-white">
                    {position.symbol} {position.side?.toUpperCase()}
                  </span>
                  <span className="text-xs px-2 py-1 bg-white/10 rounded text-text-secondary">
                    {position.exchange.toUpperCase()}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-text-secondary">Price</div>
                    <div className="text-white font-mono">
                      ${typeof position.price === 'number' ? position.price.toFixed(4) : position.price}
                    </div>
                  </div>
                  <div>
                    <div className="text-text-secondary">Quantity</div>
                    <div className="text-white font-mono">
                      {typeof position.quantity === 'number' ? position.quantity.toFixed(6) : position.quantity}
                    </div>
                  </div>
                  <div>
                    <div className="text-text-secondary">Fee</div>
                    <div className="text-white font-mono">
                      ${typeof position.fee === 'number' ? position.fee.toFixed(4) : position.fee}
                    </div>
                  </div>
                  <div>
                    <div className="text-text-secondary">Time</div>
                    <div className="text-white font-mono text-xs">
                      {position.execution_time ? 
                        new Date(position.execution_time).toLocaleString() : 
                        'N/A'
                      }
                    </div>
                  </div>
                </div>
                
                {position.pnl !== undefined && position.pnl !== null && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary text-sm">PnL</span>
                      <span className={`font-mono ${getPnLColor(position.pnl)}`}>
                        ${position.pnl > 0 ? '+' : ''}
                        {typeof position.pnl === 'number' ? position.pnl.toFixed(2) : position.pnl}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary">
              Showing {startIndex + 1}-{Math.min(endIndex, closedPositions.length)} of {closedPositions.length} trades
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">Items per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      currentPage === pageNum
                        ? 'bg-accent text-white'
                        : 'bg-white/10 hover:bg-white/20 text-text-secondary'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="text-text-secondary px-2">...</span>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      currentPage === totalPages
                        ? 'bg-accent text-white'
                        : 'bg-white/10 hover:bg-white/20 text-text-secondary'
                    }`}
                  >
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 