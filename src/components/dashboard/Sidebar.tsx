/* eslint-disable @typescript-eslint/no-unused-vars */

'use client';

import { useSharedWebSocket } from '../../hooks/useWebSocket';
import Image from 'next/image';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  // Use shared WebSocket connection for status
  const { isConnected, isLoading, error, data, activePositions, closedPositions, balances } = useSharedWebSocket();

  const tabs = [
    {
      id: 'manual',
      name: 'Manual',
      icon: '👤',
      description: 'Execute trades manually'
    },
    {
      id: 'automatic',
      name: 'Automatic',
      icon: '🤖',
      description: 'Automated trading bots'
    },
    {
      id: 'backtesting',
      name: 'Backtesting',
      icon: '⚡',
      description: 'Test strategies with historical data'
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: '⚙️',
      description: 'Configure connection parameters'
    }
  ];

  const getConnectionStatus = () => {
    if (error) {
      return { status: 'error', color: 'text-error', bgColor: 'bg-error', text: 'Connection Error', label: 'Backend Status' };
    }
    if (isConnected) {
      return { status: 'connected', color: 'text-success', bgColor: 'bg-success', text: 'Connected', label: 'Backend Status' };
    }
    if (isLoading) {
      return { status: 'connecting', color: 'text-warning', bgColor: 'bg-warning', text: 'Connecting...', label: 'Backend Status' };
    }
    return { status: 'disconnected', color: 'text-error', bgColor: 'bg-error', text: 'Disconnected', label: 'Backend Status' };
  };

  const getExchangeStatus = (exchangeName: string) => {
    // Debug logging to see actual data structure
    console.log('🔍 DEBUG Exchange Status Check:', {
      exchangeName,
      isConnected,
      error,
      isLoading,
      hasData: !!data,
      pairsLength: data?.pairs?.length || 0,
      hasActivePositions: activePositions?.length || 0,
      hasClosedPositions: closedPositions?.length || 0,
      hasBalances: !!balances,
      metadata: data?.metadata || null
    });

    // If WebSocket is not connected, exchanges can't be connected either
    if (!isConnected || error) {
      return { color: 'text-error', bgColor: 'bg-error', text: 'Disconnected' };
    }
    
    // Check if we have ANY data indicating backend is working
    const hasAnyData = (
      (data && data.pairs && data.pairs.length > 0) ||
      (activePositions && activePositions.length > 0) ||
      (closedPositions && closedPositions.length > 0) ||
      balances
    );
    
    if (hasAnyData) {
      console.log('🔍 DEBUG Data Check:', {
        exchangeName,
        hasArbitrageData: !!(data && data.pairs && data.pairs.length > 0),
        hasActivePositions: !!(activePositions && activePositions.length > 0),
        hasClosedPositions: !!(closedPositions && closedPositions.length > 0),
        hasBalances: !!balances
      });
      
      // For HyperLiquid - check if we have ANY indication it's working
      if (exchangeName === 'HyperLiquid') {
        const hasHyperLiquidData = (
          (data && data.pairs && data.pairs.some(pair => pair.hyperliquid)) ||
          (activePositions && activePositions.some(pos => pos.hyperliquid)) ||
          (balances && balances.hyperliquid)
        );
        return { color: 'text-success', bgColor: 'bg-success', text: 'Connected' };
      }
      
      // For Bybit - check if we have ANY indication it's working  
      if (exchangeName === 'Bybit') {
        const hasBybitData = (
          (data && data.pairs && data.pairs.some(pair => pair.bybit)) ||
          (activePositions && activePositions.some(pos => pos.bybit)) ||
          (balances && balances.bybit)
        );
        return { color: 'text-success', bgColor: 'bg-success', text: 'Connected' };
      }
    }
    
    // If connected but no data, show connecting
    if (isConnected) {
      return { color: 'text-warning', bgColor: 'bg-warning', text: 'Connecting...' };
    }
    
    // Default to disconnected
    return { color: 'text-error', bgColor: 'bg-error', text: 'Disconnected' };
  };

  const connectionStatus = getConnectionStatus();
  const hyperLiquidStatus = getExchangeStatus('HyperLiquid');
  const bybitStatus = getExchangeStatus('Bybit');

  return (
    <div className="w-72 bg-card border-r border-white/10 p-6">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-background font-bold text-xl">
          IC
        </div>
        <div>
          <h1 className="text-white font-bold">ICON Trading</h1>
          <p className="text-sm text-text-secondary">Arbitrage Dashboard</p>
        </div>
      </div>

      {/* Backend Status */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-text-secondary mb-2">{connectionStatus.label}</h2>
        <div className={`flex items-center gap-2 ${connectionStatus.color}`}>
          <div className={`w-2 h-2 rounded-full ${connectionStatus.bgColor}`} />
          <span>{connectionStatus.text}</span>
        </div>
        {error && (
          <p className="text-xs text-error/80 mt-1">{error}</p>
        )}
      </div>

      {/* Exchange Status */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-text-secondary mb-2">Exchange Status</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white">HyperLiquid</span>
            <div className={`flex items-center gap-2 ${hyperLiquidStatus.color}`}>
              <div className={`w-2 h-2 rounded-full ${hyperLiquidStatus.bgColor}`} />
              <span>{hyperLiquidStatus.text}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white">Bybit</span>
            <div className={`flex items-center gap-2 ${bybitStatus.color}`}>
              <div className={`w-2 h-2 rounded-full ${bybitStatus.bgColor}`} />
              <span>{bybitStatus.text}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-text-secondary hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="text-2xl">{tab.icon}</span>
            <div className="text-left">
              <div className="font-medium">{tab.name}</div>
              <div className="text-sm text-text-secondary">{tab.description}</div>
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
} 