'use client';

import { useState, useEffect } from 'react';
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

type SortField = 'execution_time' | 'symbol' | 'pnl' | 'exchange';
type SortDirection = 'asc' | 'desc';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(value);
};

const formatTime = (timeString: string) => {
  try {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch {
    return 'Invalid date';
  }
};

export default function ClosedPositions() {
  const { closedPositions, isConnected, error: wsError } = useSharedWebSocket();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Sorting state - support multi-criteria sorting
  const [primarySort, setPrimarySort] = useState<{field: SortField, direction: SortDirection} | null>({
    field: 'execution_time',
    direction: 'desc'
  });
  const [secondarySort, setSecondarySort] = useState<{field: SortField, direction: SortDirection} | null>(null);

  // Update loading state when WebSocket connects and data is received
  useEffect(() => {
    if (isConnected) {
      setError(wsError);
      setIsLoading(false);
    } else {
      setError(null);
      setIsLoading(true);
    }
  }, [isConnected, wsError]);

  // Reset to first page when positions change
  useEffect(() => {
    setCurrentPage(1);
  }, [closedPositions]);

  // Simulate periodic refresh indicator
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(() => {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 1500);
    }, 15000);
    
    return () => clearInterval(interval);
  }, [isConnected]);

  const handleSort = (field: SortField, isSecondary: boolean = false) => {
    if (isSecondary) {
      // Don't allow same field for both primary and secondary
      if (primarySort?.field === field) {
        return;
      }
      
      // Right-click or secondary action - set as secondary sort
      if (secondarySort?.field === field) {
        setSecondarySort({
          ...secondarySort,
          direction: secondarySort.direction === 'asc' ? 'desc' : 'asc'
        });
      } else {
        setSecondarySort({
          field,
          direction: field === 'execution_time' ? 'desc' : 'asc'
        });
      }
    } else {
      // Primary sort action
      if (primarySort?.field === field) {
        setPrimarySort({
          ...primarySort,
          direction: primarySort.direction === 'asc' ? 'desc' : 'asc'
        });
      } else {
        setPrimarySort({
          field,
          direction: field === 'execution_time' ? 'desc' : 'asc'
        });
        // Clear secondary sort if it's the same as new primary
        if (secondarySort?.field === field) {
          setSecondarySort(null);
        }
      }
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (primarySort?.field === field) {
      return primarySort.direction === 'asc' ? '↑' : '↓';
    }
  };

  // Helper function to get sort value for a field
  const getSortValue = (item: TradeData, field: SortField) => {
    switch (field) {
      case 'execution_time':
        return new Date(item.execution_time).getTime();
      case 'symbol':
        return item.symbol;
      case 'pnl':
        return item.pnl || 0;
      case 'exchange':
        return item.exchange;
      default:
        return '';
    }
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400';
    if (pnl < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getSideColor = (side: string) => {
    if (!side) return 'text-gray-400';
    if (side.toLowerCase() === 'buy' || side.toLowerCase() === 'long') return 'text-green-400';
    if (side.toLowerCase() === 'sell' || side.toLowerCase() === 'short') return 'text-red-400';
    return 'text-gray-400';
  };

  const getExchangeBadgeColor = (exchange: string) => {
    if (exchange.toLowerCase() === 'bybit') return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (exchange.toLowerCase() === 'hyperliquid') return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  };

  // Sort and paginate positions with multi-criteria support
  const sortedPositions = [...closedPositions].sort((a, b) => {
    // If no primary sort is set, maintain original order
    if (!primarySort) {
      return 0;
    }
    
    // Primary sort
    const aPrimary = getSortValue(a, primarySort.field);
    const bPrimary = getSortValue(b, primarySort.field);
    
    let primaryComparison = 0;
    if (aPrimary > bPrimary) primaryComparison = 1;
    else if (aPrimary < bPrimary) primaryComparison = -1;
    
    if (primarySort.direction === 'desc') {
      primaryComparison *= -1;
    }
    
    // If primary values are equal and we have secondary sort, use secondary
    if (primaryComparison === 0 && secondarySort) {
      const aSecondary = getSortValue(a, secondarySort.field);
      const bSecondary = getSortValue(b, secondarySort.field);
      
      let secondaryComparison = 0;
      if (aSecondary > bSecondary) secondaryComparison = 1;
      else if (aSecondary < bSecondary) secondaryComparison = -1;
      
      if (secondarySort.direction === 'desc') {
        secondaryComparison *= -1;
      }
      
      return secondaryComparison;
    }
    
    return primaryComparison;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedPositions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPositions = sortedPositions.slice(startIndex, endIndex);

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
          Loading trades...
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
              <span className="text-sm">Live Updates</span>
            </div>
          </div>
          
          <div className="text-sm text-text-secondary bg-white/5 px-3 py-1 rounded">
            WebSocket Only
          </div>
        </div>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
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
            <span className="text-sm">Live Updates</span>
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
          Last week • {closedPositions.length} trade{closedPositions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Sorting Controls */}
      <div className="mb-4 space-y-2">
        <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
          <span className="text-sm text-white font-bold">Primary sort:</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleSort('execution_time')}
              className={`text-xs px-3 py-1 rounded transition-colors w-20 ${
                primarySort?.field === 'execution_time' 
                  ? 'bg-accent text-black font-medium' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
              }`}
            >
              Time {getSortIcon('execution_time')}
            </button>
            <button
              onClick={() => handleSort('symbol')}
              className={`text-xs px-3 py-1 rounded transition-colors w-20 ${
                primarySort?.field === 'symbol' 
                  ? 'bg-accent text-black font-medium' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
              }`}
            >
              Symbol {getSortIcon('symbol')}
            </button>
            <button
              onClick={() => handleSort('exchange')}
              className={`text-xs px-3 py-1 rounded transition-colors w-24 ${
                primarySort?.field === 'exchange' 
                  ? 'bg-accent text-black font-medium' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
              }`}
            >
              Exchange {getSortIcon('exchange')}
            </button>
            <button
              onClick={() => handleSort('pnl')}
              className={`text-xs px-3 py-1 rounded transition-colors w-16 ${
                primarySort?.field === 'pnl' 
                  ? 'bg-accent text-black font-medium' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
              }`}
            >
              PnL {getSortIcon('pnl')}
            </button>
            {primarySort && (
              <button
                onClick={() => {
                  setPrimarySort(null);
                  setSecondarySort(null);
                }}
                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                title="Clear all sorting"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        {/* Secondary Sort */}
        <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
          <span className="text-sm text-white font-bold">Secondary sort:</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleSort('execution_time', true)}
              disabled={primarySort?.field === 'execution_time'}
              className={`text-xs px-3 py-1 rounded transition-colors w-20 ${
                primarySort?.field === 'execution_time'
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                  : secondarySort?.field === 'execution_time' 
                    ? 'bg-accent text-black font-medium' 
                    : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
              }`}
            >
              Time {secondarySort?.field === 'execution_time' ? (secondarySort.direction === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button
              onClick={() => handleSort('symbol', true)}
              disabled={primarySort?.field === 'symbol'}
              className={`text-xs px-3 py-1 rounded transition-colors w-20 ${
                primarySort?.field === 'symbol'
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                  : secondarySort?.field === 'symbol' 
                    ? 'bg-accent text-black font-medium' 
                    : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
              }`}
            >
              Symbol {secondarySort?.field === 'symbol' ? (secondarySort.direction === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button
              onClick={() => handleSort('exchange', true)}
              disabled={primarySort?.field === 'exchange'}
              className={`text-xs px-3 py-1 rounded transition-colors w-24 ${
                primarySort?.field === 'exchange'
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                  : secondarySort?.field === 'exchange' 
                    ? 'bg-accent text-black font-medium' 
                    : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
              }`}
            >
              Exchange {secondarySort?.field === 'exchange' ? (secondarySort.direction === 'asc' ? '↑' : '↓') : ''}
            </button>
            <button
              onClick={() => handleSort('pnl', true)}
              disabled={primarySort?.field === 'pnl'}
              className={`text-xs px-3 py-1 rounded transition-colors w-16 ${
                primarySort?.field === 'pnl'
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                  : secondarySort?.field === 'pnl' 
                    ? 'bg-accent text-black font-medium' 
                    : 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600'
              }`}
            >
              PnL {secondarySort?.field === 'pnl' ? (secondarySort.direction === 'asc' ? '↑' : '↓') : ''}
            </button>
            {secondarySort && (
              <button
                onClick={() => setSecondarySort(null)}
                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                title="Clear secondary sort"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trades Grid */}
      <div className="space-y-3">
        {paginatedPositions.map((position, index) => (
          <div
            key={`${position.symbol}-${position.execution_time}-${index}`}
            className="bg-gradient-to-r from-white/5 to-white/3 border border-white/10 rounded-lg p-4 hover:from-white/8 hover:to-white/5 transition-all duration-200 hover:border-white/20"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {/* Header Row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`text-xs px-2 py-1 rounded border ${getExchangeBadgeColor(position.exchange)}`}>
                    {position.exchange.toUpperCase()}
                  </div>
                  <span className="font-bold text-white text-lg">
                    {position.symbol}
                  </span>
                  <span className={`font-semibold text-sm px-2 py-1 rounded ${getSideColor(position.side)} bg-white/10`}>
                    {position.side?.toUpperCase()}
                  </span>
                  <div className="flex-1"></div>
                  <span className="text-text-secondary text-xs">
                    {formatTime(position.execution_time)}
                  </span>
                </div>
                
                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div className="bg-white/5 rounded p-2">
                    <div className="text-text-secondary text-xs mb-1">Entry Price</div>
                    <div className="text-white font-mono font-medium">
                      {formatCurrency(position.price)}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <div className="text-text-secondary text-xs mb-1">Quantity</div>
                    <div className="text-white font-mono font-medium">
                      {(position.quantity || 0).toFixed(6)}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <div className="text-text-secondary text-xs mb-1">Dollar equivalent</div>
                    <div className="text-white font-mono font-medium">
                      {formatCurrency(position.price * position.quantity)}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <div className="text-text-secondary text-xs mb-1">Fee Paid</div>
                    <div className="text-white font-mono font-medium">
                      {formatCurrency(position.fee)}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <div className="text-text-secondary text-xs mb-1">Time</div>
                    <div className="text-white font-mono text-xs">
                      {new Date(position.execution_time).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {/* PnL Section */}
                {position.pnl !== undefined && position.pnl !== null && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between bg-white/5 rounded p-3">
                      <span className="text-text-secondary font-medium">Realized PnL</span>
                      <span className={`font-mono font-bold text-lg ${getPnLColor(position.pnl)}`}>
                        {position.pnl > 0 ? '+' : ''}
                        {formatCurrency(position.pnl)}
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
                className="bg-gray-800 border border-white/20 rounded px-2 py-1 text-white text-sm relative z-10"
              >
                <option value={5} className="bg-gray-800 text-white">5</option>
                <option value={10} className="bg-gray-800 text-white">10</option>
                <option value={20} className="bg-gray-800 text-white">20</option>
                <option value={50} className="bg-gray-800 text-white">50</option>
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