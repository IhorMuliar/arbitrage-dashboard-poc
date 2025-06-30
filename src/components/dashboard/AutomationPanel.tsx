/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

'use client';

import { useState } from 'react';
import { useSharedWebSocket } from '../../hooks/useWebSocket';
import { useTradingAPI } from '../../hooks/useTradingAPI';

interface AutomationSettings {
  enabled: boolean;
  minFundingRate: number;  // Minimum funding rate to open
  closeFundingRate: number; // Funding rate to close
  minSpreadPercent: number; // Minimum spread between exchanges
  maxSpreadPercent: number; // Maximum spread between exchanges
  positionSizeUSD: number;  // Position size in USD
  maxDepositUsage: number;  // Maximum percentage of deposit to use
}

interface Position {
  id: string;
  symbol: string;
  size: number;
  entryPrice: number;
  currentPrice: number;
  fundingRate: number;
  pnl: number;
  timestamp: number;
}

export default function AutomationPanel() {
  const [settings, setSettings] = useState<AutomationSettings>({
    enabled: false,
    minFundingRate: 0.01, // 1% minimum funding rate
    closeFundingRate: 0.005, // 0.5% funding rate to close
    minSpreadPercent: 0.1, // 0.1% minimum spread
    maxSpreadPercent: 0.5, // 0.5% maximum spread
    positionSizeUSD: 1000, // $1000 default position size
    maxDepositUsage: 90, // 90% maximum deposit usage
  });

  const [positions, setPositions] = useState<Position[]>([]);
  const { isConnected, balances: accountBalances } = useSharedWebSocket();
  const { openPosition, closePosition } = useTradingAPI();

  // Calculate available balance and maximum position size
  const totalBalance = accountBalances 
    ? Math.min(accountBalances.bybit.total, accountBalances.hyperliquid.total)
    : 0;
  
  const maxAllowedPosition = totalBalance * (settings.maxDepositUsage / 100);

  const handleToggleAutomation = () => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleSettingChange = (setting: keyof AutomationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [setting]: value }));
  };

  const handleClosePosition = async (positionId: string) => {
    try {
      const position = positions.find(p => p.id === positionId);
      if (!position) return;

      const result = await closePosition(position.symbol);
      if (result.success) {
        setPositions(prev => prev.filter(p => p.id !== positionId));
      }
    } catch (error) {
      console.error('Failed to close position:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Control Panel */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Automation Control</h2>
          <div className="flex items-center gap-4">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success' : 'bg-error'}`} />
            <span className="text-sm text-text-secondary">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            <button
              onClick={handleToggleAutomation}
              disabled={!isConnected}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                settings.enabled
                  ? 'bg-error hover:bg-error/90'
                  : 'bg-success hover:bg-success/90'
              } text-background disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {settings.enabled ? 'Stop' : 'Start'} Automation
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Funding Rate Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">
                Minimum Funding Rate to Open
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.minFundingRate * 100}
                  onChange={(e) => handleSettingChange('minFundingRate', parseFloat(e.target.value) / 100)}
                  min={0}
                  max={10}
                  step={0.01}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                />
                <span className="text-text-secondary">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">
                Funding Rate to Close
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.closeFundingRate * 100}
                  onChange={(e) => handleSettingChange('closeFundingRate', parseFloat(e.target.value) / 100)}
                  min={0}
                  max={10}
                  step={0.01}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                />
                <span className="text-text-secondary">%</span>
              </div>
            </div>
          </div>

          {/* Spread Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">
                Minimum Spread
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.minSpreadPercent}
                  onChange={(e) => handleSettingChange('minSpreadPercent', parseFloat(e.target.value))}
                  min={0}
                  max={1}
                  step={0.01}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                />
                <span className="text-text-secondary">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">
                Maximum Spread
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.maxSpreadPercent}
                  onChange={(e) => handleSettingChange('maxSpreadPercent', parseFloat(e.target.value))}
                  min={0.1}
                  max={5}
                  step={0.01}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                />
                <span className="text-text-secondary">%</span>
              </div>
            </div>
          </div>

          {/* Position Size and Deposit Usage */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">
                Position Size
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.positionSizeUSD}
                  onChange={(e) => handleSettingChange('positionSizeUSD', parseFloat(e.target.value))}
                  min={10}
                  max={maxAllowedPosition}
                  step={10}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                />
                <span className="text-text-secondary">USDT</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">
                Maximum Deposit Usage
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.maxDepositUsage}
                  onChange={(e) => handleSettingChange('maxDepositUsage', parseFloat(e.target.value))}
                  min={10}
                  max={95}
                  step={5}
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent"
                />
                <span className="text-text-secondary">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Positions */}
      <div className="glass-card rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Active Positions</h2>
        
        {positions.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            No active positions
          </div>
        ) : (
          <div className="space-y-4">
            {positions.map((position) => (
              <div key={position.id} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-medium text-white">{position.symbol}</span>
                  <button
                    onClick={() => handleClosePosition(position.id)}
                    className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                  >
                    Close Position
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-text-secondary">Size</div>
                    <div className="text-white">{position.size.toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-text-secondary">Entry Price</div>
                    <div className="text-white">${position.entryPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-text-secondary">Current Price</div>
                    <div className="text-white">${position.currentPrice.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-text-secondary">Funding Rate</div>
                    <div className="text-success">+{(position.fundingRate * 100).toFixed(4)}%</div>
                  </div>
                  <div>
                    <div className="text-text-secondary">PnL</div>
                    <div className={position.pnl >= 0 ? 'text-success' : 'text-error'}>
                      {position.pnl >= 0 ? '+' : ''}{position.pnl.toFixed(2)} USDT
                    </div>
                  </div>
                  <div>
                    <div className="text-text-secondary">Time</div>
                    <div className="text-white">
                      {new Date(position.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connection Warning */}
      {!isConnected && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-warning">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">Connection Required</span>
          </div>
          <p className="text-warning/80 text-sm mt-2">
            Please ensure you are connected to the trading server before enabling automation.
          </p>
        </div>
      )}
    </div>
  );
} 