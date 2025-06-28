'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import FundingRatesTable from './FundingRatesTable';
import TradeSetupPanel from './TradeSetupPanel';
import ActivePositionsMonitor from './ActivePositionsMonitor';

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

interface TradeData {
  pair: string;
  amount: number;
  currency: 'USDT' | 'BTC' | 'ETH';
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('manual');
  const [selectedPair, setSelectedPair] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);

  const handlePairSelect = (pair: string) => {
    setSelectedPair(pair);
  };

  const handleExecuteTrade = (trade: TradeData) => {
    // Create a new position
    const newPosition: Position = {
      id: `POS-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      pair: trade.pair,
      entryTime: new Date(),
      currentPnL: 0, // Will be updated by real-time data
      status: 'Opening',
      amount: trade.amount,
      entryPrice: {
        hyperliquid: 50000, // Mock price
        bybit: 49950 // Mock price
      },
      currentPrice: {
        hyperliquid: 50000,
        bybit: 49950
      }
    };

    setPositions(prev => [...prev, newPosition]);

    // Simulate position status changes
    setTimeout(() => {
      setPositions(prev => prev.map(pos => 
        pos.id === newPosition.id 
          ? { ...pos, status: 'Active' as const, currentPnL: Math.random() * 100 - 20 }
          : pos
      ));
    }, 2000);

    // Simulate P&L updates
    const pnlInterval = setInterval(() => {
      setPositions(prev => prev.map(pos => 
        pos.id === newPosition.id && pos.status === 'Active'
          ? { ...pos, currentPnL: pos.currentPnL + (Math.random() - 0.5) * 10 }
          : pos
      ));
    }, 3000);

    // Cleanup interval after 5 minutes (for demo)
    setTimeout(() => {
      clearInterval(pnlInterval);
    }, 5 * 60 * 1000);
  };

  const handleClosePosition = (positionId: string) => {
    setPositions(prev => prev.map(pos => 
      pos.id === positionId 
        ? { ...pos, status: 'Closing' as const }
        : pos
    ));

    // Simulate closing delay
    setTimeout(() => {
      setPositions(prev => prev.map(pos => 
        pos.id === positionId 
          ? { ...pos, status: 'Closed' as const }
          : pos
      ));
    }, 3000);
  };

  const handleModifyPosition = (positionId: string) => {
    // In a real app, this would open a modify position modal
    console.log('Modify position:', positionId);
    // For now, just show an alert
    alert(`Modify position ${positionId} - Feature coming soon!`);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'manual':
        return (
          <div className="space-y-6">
            {/* Funding Rates Table - Combined arbitrage opportunities */}
            <FundingRatesTable onPairSelect={handlePairSelect} />
            
            {/* Trade Setup Panel */}
            <TradeSetupPanel 
              selectedPair={selectedPair}
              onPairChange={setSelectedPair}
              onExecuteTrade={handleExecuteTrade}
            />
            
            {/* Active Positions Monitor */}
            <ActivePositionsMonitor 
              positions={positions}
              onClosePosition={handleClosePosition}
              onModifyPosition={handleModifyPosition}
            />
          </div>
        );
      
      case 'automatic':
        return (
          <div className="glass-card rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-2xl font-bold text-white mb-2">Automatic Trading</h2>
            <p className="text-text-secondary">
              Automated arbitrage strategies are coming soon. 
              Set up your trading bots to execute opportunities automatically.
            </p>
          </div>
        );
      
      case 'backtesting':
        return (
          <div className="glass-card rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">📈</div>
            <h2 className="text-2xl font-bold text-white mb-2">Backtesting</h2>
            <p className="text-text-secondary">
              Test your arbitrage strategies against historical data. 
              Optimize your approach before deploying real capital.
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              {activeTab === 'manual' && 'Manual Trading'}
              {activeTab === 'automatic' && 'Automatic Trading'}
              {activeTab === 'backtesting' && 'Backtesting'}
            </h1>
            <p className="text-text-secondary">
              {activeTab === 'manual' && 'Execute arbitrage trades manually between HyperLiquid and Bybit'}
              {activeTab === 'automatic' && 'Set up automated trading strategies for continuous arbitrage'}
              {activeTab === 'backtesting' && 'Test and optimize your trading strategies with historical data'}
            </p>
          </div>
          
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
} 