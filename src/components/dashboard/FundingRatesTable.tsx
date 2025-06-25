'use client';

import { useState, useEffect } from 'react';

interface FundingRate {
  pair: string;
  rate: number;
  nextFunding: Date;
  bybitAvailable: boolean;
  spreadOpportunity: number;
}

interface FundingRatesTableProps {
  onPairSelect: (pair: string) => void;
}

export default function FundingRatesTable({ onPairSelect }: FundingRatesTableProps) {
  const [sortField, setSortField] = useState<keyof FundingRate>('rate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data - replace with real API calls
  const [fundingRates] = useState<FundingRate[]>([
    {
      pair: 'BTC/USDT',
      rate: 0.0024,
      nextFunding: new Date(Date.now() + 3.5 * 60 * 60 * 1000),
      bybitAvailable: true,
      spreadOpportunity: 0.0018
    },
    {
      pair: 'ETH/USDT',
      rate: -0.0012,
      nextFunding: new Date(Date.now() + 3.5 * 60 * 60 * 1000),
      bybitAvailable: true,
      spreadOpportunity: 0.0008
    },
    {
      pair: 'SOL/USDT',
      rate: 0.0045,
      nextFunding: new Date(Date.now() + 3.5 * 60 * 60 * 1000),
      bybitAvailable: true,
      spreadOpportunity: 0.0032
    },
    {
      pair: 'DOGE/USDT',
      rate: 0.0089,
      nextFunding: new Date(Date.now() + 3.5 * 60 * 60 * 1000),
      bybitAvailable: false,
      spreadOpportunity: 0.0000
    },
    {
      pair: 'AVAX/USDT',
      rate: -0.0034,
      nextFunding: new Date(Date.now() + 3.5 * 60 * 60 * 1000),
      bybitAvailable: true,
      spreadOpportunity: 0.0021
    }
  ]);

  const filteredAndSorted = fundingRates
    .filter(rate => rate.pair.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * direction;
      }
      
      return String(aVal).localeCompare(String(bVal)) * direction;
    });

  const handleSort = (field: keyof FundingRate) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">
          HyperLiquid Funding Rates & Bybit Spot Availability
        </h2>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search pairs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-tertiary border border-white/10 rounded-lg text-white placeholder-text-secondary focus:border-accent focus:outline-none"
          />
        </div>
      </div>

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
                onClick={() => handleSort('rate')}
                className="text-right py-3 px-4 text-sm font-medium text-accent cursor-pointer hover:text-white transition-colors"
              >
                Funding Rate {sortField === 'rate' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-accent">
                Next Funding
              </th>
              <th className="text-center py-3 px-4 text-sm font-medium text-accent">
                Bybit Spot
              </th>
              <th 
                onClick={() => handleSort('spreadOpportunity')}
                className="text-right py-3 px-4 text-sm font-medium text-accent cursor-pointer hover:text-white transition-colors"
              >
                Opportunity {sortField === 'spreadOpportunity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((rate) => (
              <tr
                key={rate.pair}
                onClick={() => onPairSelect(rate.pair)}
                className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors group"
              >
                <td className="py-4 px-4 text-white font-medium">
                  {rate.pair}
                </td>
                <td className={`py-4 px-4 text-right font-mono ${
                  rate.rate > 0 ? 'text-success' : 'text-error'
                }`}>
                  {(rate.rate * 100).toFixed(4)}%
                </td>
                <td className="py-4 px-4 text-center">
                  <CountdownTimer targetDate={rate.nextFunding} />
                </td>
                <td className="py-4 px-4 text-center">
                  <span className={`text-lg ${rate.bybitAvailable ? 'text-success' : 'text-error'}`}>
                    {rate.bybitAvailable ? '✓' : '✗'}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  {rate.spreadOpportunity > 0 ? (
                    <span className="text-warning font-mono font-bold">
                      {(rate.spreadOpportunity * 100).toFixed(4)}%
                    </span>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft('Funding now');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <span className="text-sm text-text-secondary font-mono">
      {timeLeft}
    </span>
  );
} 