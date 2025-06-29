/* eslint-disable @typescript-eslint/no-unused-vars */

'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import FundingRatesTable from './FundingRatesTable';
import TradeSetupPanel from './TradeSetupPanel';
import ActivePositionsMonitor from './ActivePositionsMonitor';
import ClosedPositions from './ClosedPositions';
import AutomationPanel from './AutomationPanel';

interface ConnectionSettings {
  websocket: {
    host: string;
    port: number;
  };
  api: {
    host: string;
    port: number;
  };
  bybit: {
    api_key: string;
    secret: string;
    testnet: boolean;
  };
  hyperliquid: {
    secret_key: string;
    account_address: string;
    testnet: boolean;
  };
}

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
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editedSettings, setEditedSettings] = useState<ConnectionSettings>({
    websocket: {
      host: 'localhost',
      port: 8765,
    },
    api: {
      host: 'localhost',
      port: 8080,
    },
    bybit: {
      api_key: '',
      secret: '',
      testnet: false,
    },
    hyperliquid: {
      secret_key: '',
      account_address: '',
      testnet: false,
    },
  });
  const [connectionSettings, setConnectionSettings] = useState<ConnectionSettings>({
    websocket: {
      host: 'localhost',
      port: 8765,
    },
    api: {
      host: 'localhost',
      port: 8080,
    },
    bybit: {
      api_key: '',
      secret: '',
      testnet: false,
    },
    hyperliquid: {
      secret_key: '',
      account_address: '',
      testnet: false,
    },
  });

  const handleStartEditing = () => {
    setEditedSettings(connectionSettings);
    setIsEditingSettings(true);
  };

  const handleCancelEditing = () => {
    setIsEditingSettings(false);
    setEditedSettings(connectionSettings);
  };

  const handleSaveSettings = () => {
    setConnectionSettings(editedSettings);
    setIsEditingSettings(false);
  };

  const handleSettingChange = (
    section: keyof ConnectionSettings,
    field: string,
    value: string | number | boolean
  ) => {
    setEditedSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

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

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {/* WebSocket Settings */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">WebSocket Settings</h3>
          <div className="flex gap-4">
            {!isEditingSettings ? (
              <button
                onClick={handleStartEditing}
                className="px-4 py-2 bg-accent text-background rounded-lg font-medium hover:bg-accent/80 transition-colors"
              >
                Edit Settings
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancelEditing}
                  className="px-4 py-2 bg-white/5 text-white rounded-lg font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-accent text-background rounded-lg font-medium hover:bg-accent/80 transition-colors"
                >
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Host</label>
            <input
              type="text"
              value={isEditingSettings ? editedSettings.websocket.host : connectionSettings.websocket.host}
              onChange={(e) => handleSettingChange('websocket', 'host', e.target.value)}
              disabled={!isEditingSettings}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Port</label>
            <input
              type="number"
              value={isEditingSettings ? editedSettings.websocket.port : connectionSettings.websocket.port}
              onChange={(e) => handleSettingChange('websocket', 'port', parseInt(e.target.value))}
              disabled={!isEditingSettings}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* API Settings */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">API Settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Host</label>
            <input
              type="text"
              value={isEditingSettings ? editedSettings.api.host : connectionSettings.api.host}
              onChange={(e) => handleSettingChange('api', 'host', e.target.value)}
              disabled={!isEditingSettings}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Port</label>
            <input
              type="number"
              value={isEditingSettings ? editedSettings.api.port : connectionSettings.api.port}
              onChange={(e) => handleSettingChange('api', 'port', parseInt(e.target.value))}
              disabled={!isEditingSettings}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Bybit Settings */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Bybit Settings</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">API Key</label>
            <input
              type="password"
              value={isEditingSettings ? editedSettings.bybit.api_key : connectionSettings.bybit.api_key}
              onChange={(e) => handleSettingChange('bybit', 'api_key', e.target.value)}
              disabled={!isEditingSettings}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your Bybit API key"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Secret</label>
            <input
              type="password"
              value={isEditingSettings ? editedSettings.bybit.secret : connectionSettings.bybit.secret}
              onChange={(e) => handleSettingChange('bybit', 'secret', e.target.value)}
              disabled={!isEditingSettings}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your Bybit secret"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="bybit-testnet"
              checked={isEditingSettings ? editedSettings.bybit.testnet : connectionSettings.bybit.testnet}
              onChange={(e) => handleSettingChange('bybit', 'testnet', e.target.checked)}
              disabled={!isEditingSettings}
              className="w-4 h-4 rounded border-white/10 bg-white/5 text-accent focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="bybit-testnet" className="text-sm font-medium text-text-secondary">
              Use Testnet
            </label>
          </div>
        </div>
      </div>

      {/* HyperLiquid Settings */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">HyperLiquid Settings</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Secret Key</label>
            <input
              type="password"
              value={isEditingSettings ? editedSettings.hyperliquid.secret_key : connectionSettings.hyperliquid.secret_key}
              onChange={(e) => handleSettingChange('hyperliquid', 'secret_key', e.target.value)}
              disabled={!isEditingSettings}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your HyperLiquid secret key"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Account Address</label>
            <input
              type="text"
              value={isEditingSettings ? editedSettings.hyperliquid.account_address : connectionSettings.hyperliquid.account_address}
              onChange={(e) => handleSettingChange('hyperliquid', 'account_address', e.target.value)}
              disabled={!isEditingSettings}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter your HyperLiquid account address"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hyperliquid-testnet"
              checked={isEditingSettings ? editedSettings.hyperliquid.testnet : connectionSettings.hyperliquid.testnet}
              onChange={(e) => handleSettingChange('hyperliquid', 'testnet', e.target.checked)}
              disabled={!isEditingSettings}
              className="w-4 h-4 rounded border-white/10 bg-white/5 text-accent focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="hyperliquid-testnet" className="text-sm font-medium text-text-secondary">
              Use Testnet
            </label>
          </div>
        </div>
      </div>
    </div>
  );

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
              onClosePosition={handleClosePosition}
              onModifyPosition={handleModifyPosition}
            />
            
            {/* Closed Positions */}
            <ClosedPositions />
          </div>
        );
      
      case 'automatic':
        return <AutomationPanel />;
      
      case 'backtesting':
        return (
          <div className="glass-card rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">⚡</div>
            <h2 className="text-2xl font-bold text-white mb-2">Backtesting</h2>
            <p className="text-text-secondary">
              Test your arbitrage strategies against historical data. 
              Optimize your approach before deploying real capital.
            </p>
          </div>
        );

      case 'settings':
        return renderSettingsTab();
      
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
              {activeTab === 'settings' && 'Connection Settings'}
            </h1>
            <p className="text-text-secondary">
              {activeTab === 'manual' && 'View comprehensive data from HyperLiquid and Bybit exchanges to execute arbitrage trades manually'}
              {activeTab === 'automatic' && 'Set up automated trading strategies for continuous arbitrage'}
              {activeTab === 'backtesting' && 'Test and optimize your trading strategies with historical data'}
              {activeTab === 'settings' && 'Configure connection parameters for WebSocket, API, and exchange credentials'}
            </p>
          </div>
          
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
} 