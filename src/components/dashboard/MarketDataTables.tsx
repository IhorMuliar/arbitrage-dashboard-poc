'use client';

import { useState, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';

interface HyperLiquidData {
  pair_name: string;
  bid_price: number;
  bid_size: number;
  ask_price: number;
  ask_size: number;
  volume_24h: number;
  hourly_rate: number;
  annual_rate: number;
  exchange: string;
}

interface BybitData {
  pair_name: string;
  bid_price: number;
  ask_price: number;
  volume_24h: number;
  spread_percent: number;
  exchange: string;
}

interface MarketData {
  hyperliquid: Record<string, HyperLiquidData>;
  bybit: Record<string, BybitData>;
  timestamp: number;
}

// Extended WebSocket data interface that includes market data
interface ExtendedWebSocketData {
  type: string;
  market_data?: MarketData;
  funding_data?: any;
  timestamp: number;
}

export default function MarketDataTables() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [hyperliquidPage, setHyperliquidPage] = useState(1);
  const [bybitPage, setBybitPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [hyperliquidSearch, setHyperliquidSearch] = useState('');
  const [bybitSearch, setBybitSearch] = useState('');

  const { data: wsData, isConnected, error } = useWebSocket('ws://localhost:8765');

  // Handle WebSocket messages for market data from the shared connection
  useEffect(() => {
    // This component will now use the shared WebSocket connection
    // and listen for market data in the useWebSocket hook
    console.log('🔌 MarketDataTables using shared WebSocket connection');
    
    // Market data will be received via a separate mechanism
    // For now, we'll fetch it via HTTP API as fallback
    const fetchMarketData = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/market/data');
        if (response.ok) {
          const data = await response.json();
          console.log('📊 Fetched market data via HTTP:', data);
          setMarketData(data);
        }
      } catch (err) {
        console.error('❌ Error fetching market data via HTTP:', err);
      }
    };

    // Fetch market data initially and every 3 seconds
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 3000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const formatNumber = (num: number, decimals: number = 6) => {
    if (num === 0) return '0.00';
    return num.toFixed(decimals);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toFixed(2);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate > 0 ? '+' : '')}${rate.toFixed(3)}%`;
  };

  // Filter and paginate HyperLiquid data
  const hyperliquidEntries = marketData?.hyperliquid 
    ? Object.entries(marketData.hyperliquid).filter(([key, _]) => key !== '_metadata')
    : [];
  
  const filteredHyperliquid = hyperliquidEntries.filter(([_, data]) =>
    data.pair_name.toLowerCase().includes(hyperliquidSearch.toLowerCase())
  );

  const totalHyperliquidPages = Math.ceil(filteredHyperliquid.length / itemsPerPage);
  const hyperliquidStartIndex = (hyperliquidPage - 1) * itemsPerPage;
  const paginatedHyperliquid = filteredHyperliquid.slice(
    hyperliquidStartIndex,
    hyperliquidStartIndex + itemsPerPage
  );

  // Filter and paginate Bybit data
  const bybitEntries = marketData?.bybit 
    ? Object.entries(marketData.bybit).filter(([key, _]) => key !== '_metadata')
    : [];
  
  const filteredBybit = bybitEntries.filter(([_, data]) =>
    data.pair_name.toLowerCase().includes(bybitSearch.toLowerCase())
  );

  const totalBybitPages = Math.ceil(filteredBybit.length / itemsPerPage);
  const bybitStartIndex = (bybitPage - 1) * itemsPerPage;
  const paginatedBybit = filteredBybit.slice(
    bybitStartIndex,
    bybitStartIndex + itemsPerPage
  );

  const hasMarketData = marketData && (Object.keys(marketData.hyperliquid || {}).length > 0 || Object.keys(marketData.bybit || {}).length > 0);

  return (
    <div className="space-y-8">
      {/* Connection Status */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
          hasMarketData ? 'bg-accent-green/20 text-accent-green' : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${hasMarketData ? 'bg-accent-green animate-pulse' : 'bg-yellow-500'}`}></span>
          {hasMarketData ? 'Market Data Connected' : 'Waiting for Market Data...'}
        </div>
        {error && (
          <div className="text-red-400 text-sm">
            Error: {error}
          </div>
        )}
      </div>

      {!hasMarketData && (
        <div className="glass-card rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-white mb-2">Loading Market Data</h3>
          <p className="text-text-secondary">
            Fetching comprehensive market data from HyperLiquid and Bybit exchanges...
          </p>
        </div>
      )}

      {/* HyperLiquid Table */}
      {hasMarketData && filteredHyperliquid.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                🌊 HyperLiquid Market Data
                <span className={`w-2 h-2 rounded-full ${hasMarketData ? 'bg-accent-green animate-pulse' : 'bg-red-500'}`}></span>
              </h2>
              <p className="text-text-secondary">
                Live updates • {filteredHyperliquid.length} pairs available
              </p>
            </div>
            
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search pairs..."
                value={hyperliquidSearch}
                onChange={(e) => setHyperliquidSearch(e.target.value)}
                className="px-4 py-2 rounded-lg bg-background border border-border text-white placeholder-text-secondary focus:outline-none focus:border-accent-blue"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-text-secondary font-medium py-3 px-4">Pair Name</th>
                  <th className="text-right text-text-secondary font-medium py-3 px-4">Buy Price</th>
                  <th className="text-right text-text-secondary font-medium py-3 px-4">Size</th>
                  <th className="text-right text-text-secondary font-medium py-3 px-4">Sell Price</th>
                  <th className="text-right text-text-secondary font-medium py-3 px-4">Size</th>
                  <th className="text-right text-text-secondary font-medium py-3 px-4">24h Volume</th>
                  <th className="text-right text-text-secondary font-medium py-3 px-4">Hourly Rate</th>
                  <th className="text-right text-text-secondary font-medium py-3 px-4">Annual Rate</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHyperliquid.map(([symbol, data]) => (
                  <tr key={symbol} className="border-b border-border/30 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-medium text-white">{data.pair_name}</td>
                    <td className="py-3 px-4 text-right text-accent-green">${formatNumber(data.bid_price, 4)}</td>
                    <td className="py-3 px-4 text-right text-text-secondary">{formatNumber(data.bid_size, 1)}</td>
                    <td className="py-3 px-4 text-right text-accent-red">${formatNumber(data.ask_price, 4)}</td>
                    <td className="py-3 px-4 text-right text-text-secondary">{formatNumber(data.ask_size, 1)}</td>
                    <td className="py-3 px-4 text-right text-white">{formatVolume(data.volume_24h)}</td>
                    <td className="py-3 px-4 text-right text-accent-blue">{formatNumber(data.hourly_rate, 6)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-semibold ${data.annual_rate > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {formatPercentage(data.annual_rate)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* HyperLiquid Pagination */}
          {totalHyperliquidPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-text-secondary">
                Showing {hyperliquidStartIndex + 1}-{Math.min(hyperliquidStartIndex + itemsPerPage, filteredHyperliquid.length)} of {filteredHyperliquid.length}
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setHyperliquidPage(prev => Math.max(1, prev - 1))}
                  disabled={hyperliquidPage === 1}
                  className="px-3 py-1 rounded bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="px-3 py-1 text-white">
                  Page {hyperliquidPage} of {totalHyperliquidPages}
                </span>
                
                <button
                  onClick={() => setHyperliquidPage(prev => Math.min(totalHyperliquidPages, prev + 1))}
                  disabled={hyperliquidPage === totalHyperliquidPages}
                  className="px-3 py-1 rounded bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bybit Table */}
      {hasMarketData && filteredBybit.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                ⚡ Bybit Market Data
                <span className={`w-2 h-2 rounded-full ${hasMarketData ? 'bg-accent-green animate-pulse' : 'bg-red-500'}`}></span>
              </h2>
              <p className="text-text-secondary">
                Live updates • {filteredBybit.length} pairs available
              </p>
            </div>
            
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search pairs..."
                value={bybitSearch}
                onChange={(e) => setBybitSearch(e.target.value)}
                className="px-4 py-2 rounded-lg bg-background border border-border text-white placeholder-text-secondary focus:outline-none focus:border-accent-blue"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-text-secondary font-medium py-3 px-4">Pair Name</th>
                  <th className="text-right text-text-secondary font-medium py-3 px-4">Buy Price</th>
                  <th className="text-right text-text-secondary font-medium py-3 px-4">Sell Price</th>
                  <th className="text-right text-text-secondary font-medium py-3 px-4">24h Volume</th>
                  <th className="text-right text-text-secondary font-medium py-3 px-4">Spread %</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBybit.map(([symbol, data]) => (
                  <tr key={symbol} className="border-b border-border/30 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-medium text-white">{data.pair_name}</td>
                    <td className="py-3 px-4 text-right text-accent-green">${formatNumber(data.bid_price, 4)}</td>
                    <td className="py-3 px-4 text-right text-accent-red">${formatNumber(data.ask_price, 4)}</td>
                    <td className="py-3 px-4 text-right text-white">{formatVolume(data.volume_24h)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-semibold ${data.spread_percent < 0.1 ? 'text-accent-green' : data.spread_percent < 0.5 ? 'text-yellow-400' : 'text-accent-red'}`}>
                        {formatPercentage(data.spread_percent)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bybit Pagination */}
          {totalBybitPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-text-secondary">
                Showing {bybitStartIndex + 1}-{Math.min(bybitStartIndex + itemsPerPage, filteredBybit.length)} of {filteredBybit.length}
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setBybitPage(prev => Math.max(1, prev - 1))}
                  disabled={bybitPage === 1}
                  className="px-3 py-1 rounded bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="px-3 py-1 text-white">
                  Page {bybitPage} of {totalBybitPages}
                </span>
                
                <button
                  onClick={() => setBybitPage(prev => Math.min(totalBybitPages, prev + 1))}
                  disabled={bybitPage === totalBybitPages}
                  className="px-3 py-1 rounded bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 