'use client';

import { useState, useEffect } from 'react';

interface Position {
  id: string;
  pair: string;
  entryTime: Date;
  currentPnL: number;
  status: 'Opening' | 'Active' | 'Closing' | 'Closed';
  amount: number;
  entryPrice: {
    hyperliquid: number;
    bybit: number;
  };
  currentPrice: {
    hyperliquid: number;
    bybit: number;
  };
}

interface ActivePositionsMonitorProps {
  positions: Position[];
  onClosePosition: (positionId: string) => void;
  onModifyPosition: (positionId: string) => void;
}

export default function ActivePositionsMonitor({ 
  positions, 
  onClosePosition, 
  onModifyPosition 
}: ActivePositionsMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(positions.length > 0);

  // Auto-expand when first position is added
  useEffect(() => {
    if (positions.length > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  }, [positions.length, isExpanded]);

  const totalPnL = positions.reduce((sum, pos) => sum + pos.currentPnL, 0);
  const activePositions = positions.filter(pos => pos.status === 'Active');

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Active Positions</h2>
          {positions.length > 0 && (
            <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm font-medium">
              {activePositions.length} Active
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {positions.length > 0 && (
            <div className="text-right">
              <div className="text-sm text-text-secondary">Total P&L</div>
              <div className={`text-lg font-mono font-bold ${
                totalPnL >= 0 ? 'text-success' : 'text-error'
              }`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </div>
            </div>
          )}
          
          <div className={`transform transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}>
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Content */}
      <div className={`transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
      } overflow-hidden`}>
        {positions.length === 0 ? (
          <div className="p-6 pt-0">
            <div className="text-center py-8 text-text-secondary">
              <div className="text-4xl mb-2">📊</div>
              <div className="text-lg">No active positions</div>
              <div className="text-sm">Execute your first arbitrage trade to see positions here</div>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-2 text-sm font-medium text-accent">
                      Position ID
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-accent">
                      Pair
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-accent">
                      Entry Time
                    </th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-accent">
                      Current P&L
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-accent">
                      Status
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-accent">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-2 text-white font-mono text-sm">
                        {position.id}
                      </td>
                      <td className="py-4 px-2 text-white font-medium">
                        {position.pair}
                      </td>
                      <td className="py-4 px-2 text-text-secondary text-sm">
                        <RelativeTime date={position.entryTime} />
                      </td>
                      <td className={`py-4 px-2 text-right font-mono font-bold ${
                        position.currentPnL >= 0 ? 'text-success' : 'text-error'
                      }`}>
                        {position.currentPnL >= 0 ? '+' : ''}${position.currentPnL.toFixed(2)}
                      </td>
                      <td className="py-4 px-2 text-center">
                        <StatusBadge status={position.status} />
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => onModifyPosition(position.id)}
                            disabled={position.status !== 'Active'}
                            className="px-3 py-1 bg-white/10 border border-white/20 rounded text-xs text-white hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Modify
                          </button>
                          <button
                            onClick={() => onClosePosition(position.id)}
                            disabled={position.status === 'Closing' || position.status === 'Closed'}
                            className="px-3 py-1 bg-error/20 border border-error/40 rounded text-xs text-error hover:bg-error/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Position Details */}
            {positions.length > 0 && (
              <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-sm font-medium text-white mb-3">Quick Stats</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-text-secondary">Total Positions:</span>
                    <span className="block text-white font-mono">{positions.length}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Active:</span>
                    <span className="block text-success font-mono">{activePositions.length}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Total Volume:</span>
                    <span className="block text-white font-mono">
                      ${positions.reduce((sum, pos) => sum + pos.amount, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Position['status'] }) {
  const statusConfig = {
    Opening: { color: 'text-warning', bg: 'bg-warning/20', border: 'border-warning/40' },
    Active: { color: 'text-success', bg: 'bg-success/20', border: 'border-success/40' },
    Closing: { color: 'text-accent', bg: 'bg-accent/20', border: 'border-accent/40' },
    Closed: { color: 'text-text-secondary', bg: 'bg-white/10', border: 'border-white/20' }
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${config.color} ${config.bg} ${config.border}`}>
      {status}
    </span>
  );
}

function RelativeTime({ date }: { date: Date }) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    const updateTimeAgo = () => {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      
      if (minutes < 60) {
        setTimeAgo(`${minutes}m ago`);
      } else if (hours < 24) {
        setTimeAgo(`${hours}h ago`);
      } else {
        setTimeAgo(date.toLocaleDateString());
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [date]);

  return <span>{timeAgo}</span>;
} 