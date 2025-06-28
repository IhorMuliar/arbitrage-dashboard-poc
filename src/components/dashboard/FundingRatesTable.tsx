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
  const [pairsPerPage, setPairsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [newPairsAlert, setNewPairsAlert] = useState<string[]>([]);

  // Use shared WebSocket connection - no more individual connections
  const { data: arbitrageData, isConnected, isLoading, error, reconnect } = useSharedWebSocket();

  const fundingRates = arbitrageData?.pairs || [];

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

  // Debug: Log data to console to see what we're receiving
  console.log('Debug - fundingRates:', fundingRates.length, 'filteredAndSorted:', filteredAndSorted.length, 'filterBybitAvailable:', filterBybitAvailable);
  if (fundingRates.length > 0) {
    console.log('Sample pair:', fundingRates[0]);
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">
            All Positive Funding Opportunities - Real-time
          </h2>
          <div className="flex items-center gap-4 mt-2">
            <div className={`flex items-center gap-2 text-sm ${isConnected ? 'text-success' : 'text-error'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-error'}`}></div>
              <span>{isConnected ? 'Live Updates' : 'Disconnected'}</span>
            </div>
            {arbitrageData?.metadata && (
              <div className="text-sm text-text-secondary">
                <span className="text-accent font-semibold">{arbitrageData.metadata.positive_funding_pairs}</span> positive funding pairs
                {' • '}
                <span className="text-success font-semibold">{arbitrageData.metadata.bybit_available_pairs}</span> available on Bybit
              </div>
            )}
            {arbitrageData?.metadata?.real_time_monitoring && (
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
            🚀 New positive funding pairs detected: {newPairsAlert.join(', ')}
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
          {pairsPerPage === 0 ? (
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
              className="px-3 py-1 bg-tertiary border border-white/10 rounded text-white disabled:opacity-50 hover:bg-white/5"
            >
              Previous
            </button>
            <span className="text-white">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-tertiary border border-white/10 rounded text-white disabled:opacity-50 hover:bg-white/5"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {isLoading && !arbitrageData && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <p className="text-text-secondary mt-2">Loading arbitrage data...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="text-center py-8">
          <div className="text-error mb-2">⚠️ Connection Error</div>
          <p className="text-text-secondary mb-4">{error}</p>
          <button
            onClick={reconnect}
            className="bg-accent text-background px-4 py-2 rounded-lg hover:bg-accent/80 transition-colors"
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

      {/* Show raw data debug info when connected but no filtered data */}
      {!isLoading && !error && arbitrageData && fundingRates.length > 0 && filteredAndSorted.length === 0 && (
        <div className="text-center py-8">
          <div className="text-warning mb-2">🔍 Debug Info</div>
          <div className="text-xs text-text-secondary">
            <div>Total funding rates received: {fundingRates.length}</div>
            <div>Current filter: {filterBybitAvailable}</div>
            <div>Search term: "{searchTerm}"</div>
            <div>Sample pair structure: {JSON.stringify(fundingRates[0], null, 2).substring(0, 200)}...</div>
          </div>
        </div>
      )}

      {paginatedData.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th 
                  onClick={() => handleSort('pair')}
                  className="text-left py-3 px-4 text-sm font-medium text-accent cursor-pointer hover:text-white transition-colors"
                >
                  Trading Pair {sortField === 'pair' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  onClick={() => handleSort('funding_rate')}
                  className="text-right py-3 px-4 text-sm font-medium text-accent cursor-pointer hover:text-white transition-colors"
                >
                  Funding Rate {sortField === 'funding_rate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-accent">
                  Next Funding
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-accent">
                  Bybit Spot
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-accent">
                  Volume (24h)
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((rate) => (
                <tr
                  key={rate.pair}
                  onClick={() => onPairSelect(rate.pair)}
                  className={`border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group ${
                    newPairsAlert.includes(rate.pair) ? 'bg-success/5' : ''
                  }`}
                >
                  <td className="py-4 px-4 text-white font-medium">
                    {rate.pair}
                    {newPairsAlert.includes(rate.pair) && (
                      <span className="ml-2 text-success text-xs">NEW</span>
                    )}
                  </td>
                  <td className={`py-4 px-4 text-right font-mono ${
                    rate.funding_rate > 0 ? 'text-success' : 'text-error'
                  }`}>
                    <div>{(rate.funding_rate * 100).toFixed(4)}%</div>
                    <div className="text-xs text-text-secondary">
                      {rate.annual_funding_rate.toFixed(1)}% APY
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <CountdownTimer targetTime={rate.next_funding_time} />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`text-lg ${rate.bybit.available ? 'text-success' : 'text-error'}`}>
                      {rate.bybit.available ? '✓' : '✗'}
                    </span>
                    {rate.bybit.available && (
                      <div className="text-xs text-text-secondary">
                        ${rate.bybit.last.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right text-sm">
                    <div className="text-white">
                      {formatVolume(rate.hyperliquid.volume)}
                    </div>
                    {rate.bybit.available && (
                      <div className="text-text-secondary text-xs">
                        Bybit: {formatVolume(rate.bybit.volume)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
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
            className="px-3 py-1 bg-tertiary border border-white/10 rounded text-white disabled:opacity-50 hover:bg-white/5"
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-tertiary border border-white/10 rounded text-white disabled:opacity-50 hover:bg-white/5"
          >
            Previous
          </button>
          <span className="text-white px-4">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-tertiary border border-white/10 rounded text-white disabled:opacity-50 hover:bg-white/5"
          >
            Next
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-tertiary border border-white/10 rounded text-white disabled:opacity-50 hover:bg-white/5"
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