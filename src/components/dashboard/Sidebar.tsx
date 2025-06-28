'use client';

import { useSharedWebSocket } from '../../hooks/useWebSocket';

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
      icon: '📈',
      description: 'Test strategies with historical data'
    }
  ];

  const getConnectionStatus = () => {
    if (isLoading) {
      return { status: 'connecting', color: 'text-warning', bgColor: 'bg-warning', text: 'Connecting...' };
    }
    if (error) {
      return { status: 'error', color: 'text-error', bgColor: 'bg-error', text: 'Connection Error' };
    }
    if (isConnected) {
      return { status: 'connected', color: 'text-success', bgColor: 'bg-success', text: 'Connected' };
    }
    return { status: 'disconnected', color: 'text-error', bgColor: 'bg-error', text: 'Disconnected' };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className="w-80 bg-secondary border-r border-white/10 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-background font-bold text-sm">IC</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">ICON Trading</h1>
            <p className="text-sm text-text-secondary">Arbitrage Dashboard</p>
          </div>
        </div>
        
        {/* Connection Status */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-text-secondary">Backend Status</div>
          <div className={`flex items-center gap-2 text-sm ${connectionStatus.color}`}>
            <div className={`w-2 h-2 rounded-full ${connectionStatus.bgColor} ${isLoading ? 'animate-pulse' : ''}`}></div>
            <span>{connectionStatus.text}</span>
          </div>
          
          {/* Exchange Status - only show when connected */}
          {isConnected && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-text-secondary">Exchange Status</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">HyperLiquid</span>
                  <div className="flex items-center gap-2 text-success">
                    <div className="w-2 h-2 rounded-full bg-success"></div>
                    <span>Connected</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Bybit</span>
                  <div className="flex items-center gap-2 text-success">
                    <div className="w-2 h-2 rounded-full bg-success"></div>
                    <span>Connected</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="text-xs text-error bg-error/10 rounded p-2">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-6">
        <div className="space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full text-left p-4 rounded-lg transition-all duration-200 group ${
                activeTab === tab.id
                  ? 'bg-accent text-background shadow-lg'
                  : 'text-text-secondary hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{tab.icon}</span>
                <div>
                  <div className={`font-medium ${
                    activeTab === tab.id ? 'text-background' : 'text-white'
                  }`}>
                    {tab.name}
                  </div>
                  <div className={`text-sm ${
                    activeTab === tab.id 
                      ? 'text-background/80' 
                      : 'text-text-secondary group-hover:text-text-secondary/80'
                  }`}>
                    {tab.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-white/10">
        <div className="text-xs text-text-secondary">
          <div className="mb-2">Version 1.0.0</div>
          <div>Real-time arbitrage monitoring</div>
        </div>
      </div>
    </div>
  );
} 