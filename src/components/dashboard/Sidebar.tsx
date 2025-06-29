'use client';

import { useSharedWebSocket } from '../../hooks/useWebSocket';
import Image from 'next/image';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  // Use shared WebSocket connection for status
  const { isConnected, isLoading, error } = useSharedWebSocket();

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
      return { status: 'error', color: 'text-error', bgColor: 'bg-error', text: 'Connection Error' };
    }
    if (isConnected) {
      return { status: 'connected', color: 'text-success', bgColor: 'bg-success', text: 'Connected' };
    }
    if (isLoading) {
      return { status: 'connecting', color: 'text-warning', bgColor: 'bg-warning', text: 'Connecting...' };
    }
    return { status: 'disconnected', color: 'text-error', bgColor: 'bg-error', text: 'Disconnected' };
  };

  const connectionStatus = getConnectionStatus();

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
        <h2 className="text-sm font-medium text-text-secondary mb-2">Backend Status</h2>
        <div className="flex items-center gap-2 text-success">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span>Connected</span>
        </div>
      </div>

      {/* Exchange Status */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-text-secondary mb-2">Exchange Status</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white">HyperLiquid</span>
            <div className="flex items-center gap-2 text-success">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Connected</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white">Bybit</span>
            <div className="flex items-center gap-2 text-success">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Connected</span>
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