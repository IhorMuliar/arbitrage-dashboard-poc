'use client';

import { useState, useEffect } from 'react';
import { useSharedWebSocket } from '../../hooks/useWebSocket';

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
  estimatedProfit: number;
  fees: {
    hyperliquid: number;
    bybit: number;
    total: number;
  };
  netProfit: number;
  roi: number;
}

export default function TradeSetupPanel({ selectedPair, onPairChange, onExecuteTrade }: TradeSetupPanelProps) {
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<'USDT' | 'BTC' | 'ETH'>('USDT');
  const [isExecuting, setIsExecuting] = useState(false);
  const [tradePreview, setTradePreview] = useState<TradePreview | null>(null);

  // Use shared WebSocket connection for real data
  const { data: arbitrageData, isConnected } = useSharedWebSocket();

  // Mock balance data - in a real app, this would come from the backend
  const balances = {
    USDT: 10000,
    BTC: 0.5,
    ETH: 5.2
  };

  // Get available pairs from real data
  const availablePairs = arbitrageData?.pairs
    ?.filter(pair => pair.bybit.available) // Only show pairs available on Bybit
    ?.map(pair => pair.pair) || [];

  // Get current pair data for calculations
  const currentPairData = arbitrageData?.pairs?.find(pair => pair.pair === selectedPair);

  // Calculate trade preview when amount, pair, or data changes
  useEffect(() => {
    if (amount && selectedPair && parseFloat(amount) > 0 && currentPairData) {
      const amountNum = parseFloat(amount);
      const fundingRate = currentPairData.funding_rate;

      // Calculate estimated daily profit based on funding rate
      const dailyProfit = amountNum * fundingRate;
      const expectedProfit = dailyProfit; // Estimated for next funding period
      
      // Estimate fees (these would be more accurate with real exchange data)
      const hyperliquidFee = amountNum * 0.0002; // 0.02% maker fee
      const bybitFee = amountNum * 0.001; // 0.1% spot trading fee
      const totalFees = hyperliquidFee + bybitFee;
      
      const preview: TradePreview = {
        estimatedProfit: expectedProfit,
        fees: {
          hyperliquid: hyperliquidFee,
          bybit: bybitFee,
          total: totalFees
        },
        netProfit: expectedProfit - totalFees,
        roi: (expectedProfit / amountNum) * 100
      };
      setTradePreview(preview);
    } else {
      setTradePreview(null);
    }
  }, [amount, selectedPair, currentPairData]);

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

  const isValidTrade = amount && 
                     parseFloat(amount) > 0 && 
                     selectedPair && 
                     parseFloat(amount) <= balances[currency] &&
                     currentPairData?.bybit.available;

  return (
    <div className="glass-card rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Trade Setup</h2>
        {!isConnected && (
          <div className="text-sm text-warning bg-warning/10 px-3 py-1 rounded">
            Connecting to data source...
          </div>
        )}
      </div>
      
      {/* Pair Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-secondary">
          Trading Pair
        </label>
        <div className="relative">
          <select
            value={selectedPair}
            onChange={(e) => onPairChange(e.target.value)}
            disabled={!isConnected || availablePairs.length === 0}
            className="w-full px-4 py-3 bg-tertiary border border-white/10 rounded-lg text-white focus:border-accent focus:outline-none appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {availablePairs.length === 0 
                ? (isConnected ? 'No pairs with positive funding available' : 'Loading pairs...')
                : 'Select a pair...'
              }
            </option>
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
        {selectedPair && currentPairData && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-success">
              <span>✓</span>
              <span>Valid arbitrage pair</span>
            </div>
            <div className="text-xs text-text-secondary">
              Funding rate: {(currentPairData.funding_rate * 100).toFixed(4)}% 
              ({currentPairData.annual_funding_rate.toFixed(1)}% APY)
            </div>
            <div className="text-xs text-text-secondary">
              HyperLiquid bid price: ${currentPairData.hyperliquid.bid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} |
              Bybit ask price: ${currentPairData.bybit.ask.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
            </div>
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
            {/* Uncomment when other currencies are supported
            <option value="BTC">BTC</option>
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
      {tradePreview && currentPairData && (
        <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
          <h3 className="text-sm font-medium text-white">Trade Preview</h3>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-secondary">Estimated Profit (8h):</span>
              <span className="block text-success font-mono font-bold">
                +${tradePreview.estimatedProfit.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">ROI (8h):</span>
              <span className="block text-success font-mono font-bold">
                {tradePreview.roi.toFixed(4)}%
              </span>
            </div>
            <div>
              <span className="text-text-secondary">Total Fees:</span>
              <span className="block text-error font-mono">
                -${tradePreview.fees.total.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-text-secondary">Net Profit:</span>
              <span className={`block font-mono font-bold ${
                tradePreview.netProfit > 0 ? 'text-success' : 'text-error'
              }`}>
                ${(tradePreview.netProfit).toFixed(4)}
              </span>
            </div>
          </div>
          
          {/* Fee Breakdown */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="text-xs text-text-secondary">Fee Breakdown:</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">HyperLiquid (0.02%):</span>
                <span className="text-white font-mono">${tradePreview.fees.hyperliquid.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Bybit (0.10%):</span>
                <span className="text-white font-mono">${tradePreview.fees.bybit.toFixed(4)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Execute Button */}
      <button
        onClick={handleExecute}
        disabled={!isValidTrade || isExecuting}
        className="w-full bg-accent text-background py-3 px-6 rounded-lg font-medium hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
      >
        {isExecuting ? (
          <>
            <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
            Executing Trade...
          </>
        ) : (
          'Execute Arbitrage Trade'
        )}
      </button>
      
      {!isValidTrade && amount && selectedPair && (
        <div className="text-sm text-error">
          {!currentPairData?.bybit.available 
            ? 'Selected pair is not available on Bybit'
            : parseFloat(amount) > balances[currency]
            ? 'Insufficient balance'
            : 'Please check your trade parameters'
          }
        </div>
      )}
    </div>
  );
} 