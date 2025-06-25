'use client';

import { useState, useEffect } from 'react';

interface TradeSetupPanelProps {
  selectedPair: string;
  onPairChange: (pair: string) => void;
  onExecuteTrade: (trade: TradeData) => void;
}

interface TradeData {
  pair: string;
  amount: number;
  currency: 'USDT' | 'BTC' | 'ETH';
}

interface TradePreview {
  expectedProfit: number;
  feeBreakdown: {
    hyperliquid: number;
    bybit: number;
    total: number;
  };
  riskMetrics: {
    maxDrawdown: number;
    roi: number;
  };
  positions: {
    hyperliquid: number;
    bybit: number;
  };
}

export default function TradeSetupPanel({ selectedPair, onPairChange, onExecuteTrade }: TradeSetupPanelProps) {
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<'USDT' | 'BTC' | 'ETH'>('USDT');
  const [isExecuting, setIsExecuting] = useState(false);
  const [tradePreview, setTradePreview] = useState<TradePreview | null>(null);

  // Mock balance data
  const balances = {
    USDT: 10000,
    BTC: 0.5,
    ETH: 5.2
  };

  const availablePairs = [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'AVAX/USDT', 'DOGE/USDT'
  ];

  // Calculate trade preview when amount or pair changes
  useEffect(() => {
    if (amount && selectedPair && parseFloat(amount) > 0) {
      // Mock calculation - replace with real logic
      const amountNum = parseFloat(amount);
      const preview: TradePreview = {
        expectedProfit: amountNum * 0.0024, // 0.24% profit
        feeBreakdown: {
          hyperliquid: amountNum * 0.0002,
          bybit: amountNum * 0.001,
          total: amountNum * 0.0012
        },
        riskMetrics: {
          maxDrawdown: amountNum * 0.05,
          roi: 0.24
        },
        positions: {
          hyperliquid: amountNum * 0.5,
          bybit: amountNum * 0.5
        }
      };
      setTradePreview(preview);
    } else {
      setTradePreview(null);
    }
  }, [amount, selectedPair]);

  const handlePercentageClick = (percentage: number) => {
    const balance = balances[currency];
    const newAmount = (balance * percentage / 100).toString();
    setAmount(newAmount);
  };

  const handleExecute = async () => {
    if (!amount || !selectedPair) return;
    
    setIsExecuting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock delay
      onExecuteTrade({
        pair: selectedPair,
        amount: parseFloat(amount),
        currency
      });
      setAmount('');
    } catch (error) {
      console.error('Trade execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const isValidTrade = amount && parseFloat(amount) > 0 && selectedPair && parseFloat(amount) <= balances[currency];

  return (
    <div className="glass-card rounded-xl p-6 space-y-6">
      <h2 className="text-xl font-bold text-white">Trade Setup</h2>
      
      {/* Pair Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-secondary">
          Trading Pair
        </label>
        <div className="relative">
          <select
            value={selectedPair}
            onChange={(e) => onPairChange(e.target.value)}
            className="w-full px-4 py-3 bg-tertiary border border-white/10 rounded-lg text-white focus:border-accent focus:outline-none appearance-none cursor-pointer"
          >
            <option value="">Select a pair...</option>
            {availablePairs.map(pair => (
              <option key={pair} value={pair}>{pair}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {selectedPair && (
          <div className="flex items-center gap-2 text-xs text-success">
            <span>✓</span>
            <span>Valid pair selected</span>
          </div>
        )}
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-secondary">
          Amount
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-tertiary border border-white/10 rounded-lg text-white text-lg font-mono focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'USDT' | 'BTC' | 'ETH')}
            className="px-4 py-3 bg-tertiary border border-white/10 rounded-lg text-white focus:border-accent focus:outline-none"
          >
            <option value="USDT">USDT</option>
            {/* <option value="BTC">BTC</option>
            <option value="ETH">ETH</option> */}
          </select>
        </div>
        
        <div className="flex justify-between items-center text-xs">
          <span className="text-text-secondary">
            Balance: {balances[currency].toLocaleString()} {currency}
          </span>
          <div className="flex gap-1">
            {[25, 50, 75, 100].map(percentage => (
              <button
                key={percentage}
                onClick={() => handlePercentageClick(percentage)}
                className="px-2 py-1 bg-white/5 border border-white/10 rounded text-text-secondary hover:bg-accent/20 hover:border-accent/30 hover:text-accent transition-all duration-200 text-xs"
              >
                {percentage}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trade Preview */}
      {tradePreview && (
        <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
          <h3 className="text-sm font-medium text-white">Trade Preview</h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-secondary">Expected Profit:</span>
              <span className="block text-success font-mono font-bold">
                +${tradePreview.expectedProfit.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">ROI:</span>
              <span className="block text-success font-mono font-bold">
                {tradePreview.riskMetrics.roi.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-text-secondary">Fee Breakdown:</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-text-secondary">HyperLiquid:</span>
                <span className="block text-white font-mono">
                  ${tradePreview.feeBreakdown.hyperliquid.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-text-secondary">Bybit:</span>
                <span className="block text-white font-mono">
                  ${tradePreview.feeBreakdown.bybit.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-text-secondary">Total:</span>
                <span className="block text-error font-mono">
                  ${tradePreview.feeBreakdown.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-text-secondary">Position Allocation:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-text-secondary">HyperLiquid:</span>
                <span className="block text-white font-mono">
                  ${tradePreview.positions.hyperliquid.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-text-secondary">Bybit:</span>
                <span className="block text-white font-mono">
                  ${tradePreview.positions.bybit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Execute Button */}
      <button
        onClick={handleExecute}
        disabled={!isValidTrade || isExecuting}
        className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-300 ${
          isValidTrade && !isExecuting
            ? 'bg-gradient-to-r from-accent to-blue-600 text-white neon-glow hover:shadow-xl hover:scale-[1.02]'
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isExecuting ? (
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Executing Trade...
          </div>
        ) : (
          'EXECUTE ARBITRAGE'
        )}
      </button>
    </div>
  );
} 