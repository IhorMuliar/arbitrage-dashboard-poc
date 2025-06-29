'use client';

import { useState, useEffect } from 'react';
import { useSharedWebSocket, type ArbitragePair } from '../../hooks/useWebSocket';

interface FundingRatesTableProps {
  onPairSelect: (pair: string) => void;
}

export default function FundingRatesTable({ onPairSelect }: FundingRatesTableProps) {
  const [sortField, setSortField] = useState<keyof ArbitragePair>('funding_rate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBybitAvailable, setFilterBybitAvailable] = useState<'all' | 'available' | 'unavailable'>('all');
  const [pairsPerPage, setPairsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [newPairsAlert, setNewPairsAlert] = useState<string[]>([]);

  // Use shared WebSocket connection - no more individual connections
  const { data: arbitrageData, isConnected, isLoading, error, reconnect } = useSharedWebSocket();
  
  // Show loading state only when connected but waiting for data
  const showLoadingState = isConnected && isLoading;
  // Show connecting state when not connected
  const showConnectingState = !isConnected;

  const fundingRates = isConnected ? (arbitrageData?.pairs || []) : [];

  // Track new pairs for alerts
  useEffect(() => {
    if (fundingRates.length > 0) {
      const currentPairs = new Set(fundingRates.map(pair => pair.pair));
      const newPairs = Array.from(currentPairs).filter(pair => 
        !fundingRates.some(old => old.pair === pair)
      );
      
      if (newPairs.length > 0) {
        setNewPairsAlert(newPairs);
        setTimeout(() => setNewPairsAlert([]), 5000); // Clear after 5 seconds
      }
    }
  }, [fundingRates]);

  // Filter and sort data
  const filteredAndSorted = fundingRates
    .filter(rate => {
      const matchesSearch = rate.pair.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = 
        filterBybitAvailable === 'all' ||
        (filterBybitAvailable === 'available' && rate.bybit.available) ||
        (filterBybitAvailable === 'unavailable' && !rate.bybit.available);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * direction;
      }
      
      return String(aVal).localeCompare(String(bVal)) * direction;
    });

  // Pagination - fix the infinity issue
  const effectivePairsPerPage = pairsPerPage === 0 ? filteredAndSorted.length : pairsPerPage;
  const totalPages = filteredAndSorted.length > 0 ? Math.ceil(filteredAndSorted.length / Math.max(effectivePairsPerPage, 1)) : 1;
  const startIndex = (currentPage - 1) * effectivePairsPerPage;
  const paginatedData = pairsPerPage === 0 ? filteredAndSorted : filteredAndSorted.slice(startIndex, startIndex + effectivePairsPerPage);

  const handleSort = (field: keyof ArbitragePair) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1_000_000) {
      return `${(volume / 1_000_000).toFixed(1)}M`;
    } else if (volume >= 1_000) {
      return `${(volume / 1_000).toFixed(1)}K`;
    } else {
      return volume.toFixed(0);
    }
  };

  // Function to remove /USDT suffix from pair names
  const formatPairName = (pairName: string): string => {
    return pairName.replace(/\/USDT$/, '');
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">
            Combined Exchange Data - Real-time Arbitrage Dashboard
          </h2>
          <div className="flex items-center gap-4 mt-2">
            <div className={`flex items-center gap-2 text-sm ${isConnected ? 'text-success' : 'text-error'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-error'}`}></div>
              <span>{isConnected ? '💼 Live Updates' : 'Establishing connection...'}</span>
            </div>
            {isConnected && arbitrageData?.metadata && (
              <div className="text-sm text-text-secondary">
                <span className="text-cyan-400 font-semibold">HyperLiquid:</span> {arbitrageData.metadata.hyperliquid_pairs_count} pairs
                {' • '}
                <span className="text-orange-400 font-semibold">Bybit:</span> {arbitrageData.metadata.bybit_pairs_count} pairs available
              </div>
            )}
            {isConnected && arbitrageData?.metadata && (
              <div className="text-xs text-success">
                🔄 Auto-refresh every 1 minute
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New pairs alert */}
      {newPairsAlert.length > 0 && (
        <div className="mb-4 p-3 bg-success/20 border border-success/30 rounded-lg">
          <div className="text-success text-sm font-medium">
            🚀 New positive funding pairs detected: {newPairsAlert.map(formatPairName).join(', ')}
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search pairs..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 bg-tertiary border border-white/10 rounded-lg text-white placeholder-text-secondary focus:border-accent focus:outline-none"
        />
        
        <select
          value={filterBybitAvailable}
          onChange={(e) => {
            setFilterBybitAvailable(e.target.value as 'all' | 'available' | 'unavailable');
            setCurrentPage(1);
          }}
          className="px-4 py-2 bg-tertiary border border-white/10 rounded-lg text-white focus:border-accent focus:outline-none"
        >
          <option value="all">All Pairs</option>
          <option value="available">Bybit Available Only</option>
          <option value="unavailable">Bybit Unavailable</option>
        </select>

        <select
          value={pairsPerPage}
          onChange={(e) => {
            const value = Number(e.target.value);
            setPairsPerPage(value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 bg-tertiary border border-white/10 rounded-lg text-white focus:border-accent focus:outline-none"
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
          <option value={0}>Show All ({filteredAndSorted.length})</option>
        </select>

        {error && (
          <button
            onClick={reconnect}
            className="text-sm bg-error/20 text-error px-3 py-1 rounded hover:bg-error/30 transition-colors"
          >
            Reconnect
          </button>
        )}
      </div>

      {/* Results summary */}
      <div className="flex justify-between items-center mb-4 text-sm text-text-secondary">
        <div>
          {showConnectingState ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
              <span>Establishing connection...</span>
            </div>
          ) : showLoadingState ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
              <span>Loading trading pairs...</span>
            </div>
          ) : pairsPerPage === 0 ? (
            `Showing all ${filteredAndSorted.length} pairs`
          ) : (
            `Showing ${startIndex + 1}-${Math.min(startIndex + effectivePairsPerPage, filteredAndSorted.length)} of ${filteredAndSorted.length} pairs`
          )}
        </div>
        {totalPages > 1 && pairsPerPage !== 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-cyan-600/20 border border-cyan-400/30 rounded text-cyan-200 disabled:opacity-50 disabled:text-gray-500 hover:bg-cyan-600/30 transition-colors"
            >
              Previous
            </button>
            <span className="text-white px-3 py-1 bg-gray-600/20 rounded border border-gray-500/30">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-cyan-600/20 border border-cyan-400/30 rounded text-cyan-200 disabled:opacity-50 disabled:text-gray-500 hover:bg-cyan-600/30 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {error && !isLoading && (
        <div className="text-center py-8">
          <div className="text-error mb-2">⚠️ Connection Error</div>
          <p className="text-text-secondary mb-4">{error}</p>
          <button
            onClick={reconnect}
            className="bg-cyan-500 text-black px-4 py-2 rounded-lg hover:bg-cyan-400 transition-colors font-semibold"
          >
            Try Again
          </button>
        </div>
      )}

      {!isLoading && !error && filteredAndSorted.length === 0 && arbitrageData && (
        <div className="text-center py-8">
          <div className="text-text-secondary">
            {fundingRates.length === 0 ? 'No positive funding rates found' : 'No pairs match your filters'}
          </div>
          {fundingRates.length > 0 && (
            <div className="text-xs text-text-secondary mt-2">
              Total pairs: {fundingRates.length} | Filter: {filterBybitAvailable} | Search: "{searchTerm}"
            </div>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {(showLoadingState || showConnectingState) && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-3 text-xs font-bold text-black bg-cyan-400 border-r border-cyan-500">
                  HyperLiquid Pair (USDT)
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-cyan-400 border-r border-cyan-500">
                  HL Buy Price
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-cyan-400 border-r border-cyan-500">
                  HL Size
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-cyan-400 border-r border-cyan-500">
                  HL Sell Price
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-cyan-400 border-r border-cyan-500">
                  HL Size
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-cyan-400 border-r border-cyan-500">
                  HL 24h Volume
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-cyan-400 border-r border-cyan-500">
                  HL 8h Funding Rate
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-cyan-400 border-r-2 border-cyan-600">
                  HL Annual Rate
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-orange-400 border-r border-orange-500">
                  Bybit Buy Price
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-orange-400 border-r border-orange-500">
                  Bybit Sell Price
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-orange-400 border-r border-orange-500">
                  Bybit 24h Volume
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-orange-400 border-r-2 border-orange-600">
                  Bybit Spread %
                </th>
                <th className="text-center py-3 px-3 text-xs font-bold text-black bg-gray-400 border border-gray-500">
                  Next Funding
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: pairsPerPage || 10 }, (_, i) => (
                <tr key={i} className="border-b border-white/5 animate-pulse">
                  <td className="py-3 px-3 bg-cyan-600/10">
                    <div className="h-4 bg-white/10 rounded w-20"></div>
                  </td>
                  <td className="py-3 px-3 bg-cyan-600/10">
                    <div className="h-4 bg-white/10 rounded w-16 ml-auto"></div>
                  </td>
                  <td className="py-3 px-3 bg-cyan-600/10">
                    <div className="h-4 bg-white/10 rounded w-12 ml-auto"></div>
                  </td>
                  <td className="py-3 px-3 bg-cyan-600/10">
                    <div className="h-4 bg-white/10 rounded w-16 ml-auto"></div>
                  </td>
                  <td className="py-3 px-3 bg-cyan-600/10">
                    <div className="h-4 bg-white/10 rounded w-12 ml-auto"></div>
                  </td>
                  <td className="py-3 px-3 bg-cyan-600/10">
                    <div className="h-4 bg-white/10 rounded w-12 ml-auto"></div>
                  </td>
                  <td className="py-3 px-3 bg-cyan-600/10">
                    <div className="h-4 bg-white/10 rounded w-16 ml-auto"></div>
                  </td>
                  <td className="py-3 px-3 bg-cyan-600/10">
                    <div className="h-4 bg-white/10 rounded w-16 ml-auto"></div>
                  </td>
                  <td className="py-3 px-3 bg-orange-600/10">
                    <div className="h-4 bg-white/10 rounded w-16 ml-auto"></div>
                  </td>
                  <td className="py-3 px-3 bg-orange-600/10">
                    <div className="h-4 bg-white/10 rounded w-16 ml-auto"></div>
                  </td>
                  <td className="py-3 px-3 bg-orange-600/10">
                    <div className="h-4 bg-white/10 rounded w-12 ml-auto"></div>
                  </td>
                  <td className="py-3 px-3 bg-orange-600/10">
                    <div className="h-4 bg-white/10 rounded w-14 ml-auto"></div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="h-4 bg-white/10 rounded w-16 mx-auto"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Data Table */}
      {paginatedData.length > 0 && !showLoadingState && !showConnectingState && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {/* HyperLiquid Columns */}
                <th 
                  onClick={() => handleSort('pair')}
                  className="text-left py-3 px-3 text-xs font-bold text-black cursor-pointer hover:text-gray-800 transition-colors bg-cyan-400 border-r border-cyan-500"
                >
                  HyperLiquid Pair (USDT) {sortField === 'pair' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-cyan-400 border-r border-cyan-500">
                  HL Buy Price
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-cyan-400 border-r border-cyan-500">
                  HL Size
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-cyan-400 border-r border-cyan-500">
                  HL Sell Price
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-cyan-400 border-r border-cyan-500">
                  HL Size
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-cyan-400 border-r border-cyan-500">
                  HL 24h Volume
                </th>
                <th 
                  onClick={() => handleSort('funding_rate')}
                  className="text-right py-3 px-3 text-xs font-bold text-black cursor-pointer hover:text-gray-800 transition-colors bg-cyan-400 border-r border-cyan-500"
                >
                  HL 8h Rate {sortField === 'funding_rate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-cyan-400 border-r-2 border-cyan-600">
                  HL Annual Rate
                </th>
                
                {/* Bybit Columns */}
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-orange-400 border-r border-orange-500">
                  Bybit Buy Price
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-orange-400 border-r border-orange-500">
                  Bybit Sell Price
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-orange-400 border-r border-orange-500">
                  Bybit 24h Volume
                </th>
                <th className="text-right py-3 px-3 text-xs font-bold text-black bg-orange-400 border-r-2 border-orange-600">
                  Bybit Spread %
                </th>
                
                {/* Actions */}
                <th className="text-center py-3 px-3 text-xs font-bold text-black bg-gray-400 border border-gray-500">
                  Next Funding
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((rate) => {
                // Calculate Bybit spread percentage
                const bybitSpread = rate.bybit.available && rate.bybit.ask > 0 && rate.bybit.bid > 0
                  ? ((rate.bybit.ask - rate.bybit.bid) / rate.bybit.bid) * 100
                  : 0;

                return (
                  <tr
                    key={rate.pair}
                    onClick={() => onPairSelect(rate.pair)}
                    className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group ${
                      newPairsAlert.includes(rate.pair) ? 'bg-success/5' : ''
                    }`}
                  >
                    {/* HyperLiquid Data */}
                    <td className="py-3 px-3 text-white font-medium bg-cyan-600/10">
                      {formatPairName(rate.pair)}
                      {newPairsAlert.includes(rate.pair) && (
                        <span className="ml-2 text-success text-xs">NEW</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-white font-mono bg-cyan-600/10">
                      ${rate.hyperliquid.bid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                    <td className="py-3 px-3 text-right text-text-secondary font-mono bg-cyan-600/10">
                      -
                    </td>
                    <td className="py-3 px-3 text-right text-white font-mono bg-cyan-600/10">
                      ${rate.hyperliquid.ask.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                    <td className="py-3 px-3 text-right text-text-secondary font-mono bg-cyan-600/10">
                      -
                    </td>
                    <td className="py-3 px-3 text-right text-white bg-cyan-600/10">
                      {formatVolume(rate.hyperliquid.volume_24h)}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono bg-cyan-600/10 ${
                      rate.funding_rate > 0 ? 'text-success' : 'text-error'
                    }`}>
                      {(rate.funding_rate * 100 * 8).toFixed(4)}%
                    </td>
                    <td className={`py-3 px-3 text-right font-mono bg-cyan-600/10 ${
                      rate.annual_funding_rate > 0 ? 'text-success' : 'text-error'
                    }`}>
                      {rate.annual_funding_rate.toFixed(1)}%
                    </td>
                    
                    {/* Bybit Data */}
                    <td className="py-3 px-3 text-right font-mono bg-orange-600/10">
                      {rate.bybit.available ? (
                        <span className="text-white">
                          ${rate.bybit.bid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </span>
                      ) : (
                        <span className="text-error">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono bg-orange-600/10">
                      {rate.bybit.available ? (
                        <span className="text-white">
                          ${rate.bybit.ask.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </span>
                      ) : (
                        <span className="text-error">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right bg-orange-600/10">
                      {rate.bybit.available ? (
                        <span className="text-white">{formatVolume(rate.bybit.volume_24h)}</span>
                      ) : (
                        <span className="text-error">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono bg-orange-600/10">
                      {rate.bybit.available ? (
                        <span className={`${bybitSpread < 0.1 ? 'text-success' : bybitSpread < 0.5 ? 'text-yellow-400' : 'text-error'}`}>
                          {bybitSpread.toFixed(3)}%
                        </span>
                      ) : (
                        <span className="text-error">N/A</span>
                      )}
                    </td>
                    
                    {/* Next Funding */}
                    <td className="py-3 px-3 text-center">
                      <div className="text-sm font-mono text-text-secondary">
                        --:--:--
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom pagination */}
      {totalPages > 1 && pairsPerPage !== 0 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-cyan-600/20 border border-cyan-400/30 rounded text-cyan-200 disabled:opacity-50 disabled:text-gray-500 hover:bg-cyan-600/30 transition-colors"
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-cyan-600/20 border border-cyan-400/30 rounded text-cyan-200 disabled:opacity-50 disabled:text-gray-500 hover:bg-cyan-600/30 transition-colors"
          >
            Previous
          </button>
          <span className="text-white px-4 py-1 bg-gray-600/20 rounded border border-gray-500/30">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-cyan-600/20 border border-cyan-400/30 rounded text-cyan-200 disabled:opacity-50 disabled:text-gray-500 hover:bg-cyan-600/30 transition-colors"
          >
            Next
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-cyan-600/20 border border-cyan-400/30 rounded text-cyan-200 disabled:opacity-50 disabled:text-gray-500 hover:bg-cyan-600/30 transition-colors"
          >
            Last
          </button>
        </div>
      )}
    </div>
  );
}

function CountdownTimer({ targetTime }: { targetTime: number }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const timeDiff = targetTime - now;

      if (timeDiff <= 0) {
        setTimeLeft('00:00:00');
        return;
      }
      
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        
      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  return (
    <div className="text-sm font-mono text-text-secondary">
      {timeLeft}
    </div>
  );
} 