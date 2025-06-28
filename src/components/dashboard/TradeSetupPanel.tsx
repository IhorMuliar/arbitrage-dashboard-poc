'use client';

import { useState, useEffect } from 'react';
import { useSharedWebSocket } from '../../hooks/useWebSocket';
import { useTradingAPI } from '../../hooks/useTradingAPI';

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
  pnlTimeframes: {
    eightHour: number;
    oneDay: number;
    threeDays: number;
    oneWeek: number;
  };
}

export default function TradeSetupPanel({ selectedPair, onPairChange, onExecuteTrade }: TradeSetupPanelProps) {
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<'USDT' | 'BTC' | 'ETH'>('USDT');
  const [isExecuting, setIsExecuting] = useState(false);
  const [tradePreview, setTradePreview] = useState<TradePreview | null>(null);
  const [tradeError, setTradeError] = useState<string | null>(null);

    // Use shared WebSocket connection for real data
  const { data: arbitrageData, balances: accountBalances, isConnected, isLoading } = useSharedWebSocket();
  
  // Use trading API for real trades
  const { openPosition } = useTradingAPI();

  // Calculate available balance and max position size (only when connected)
  const getAvailableBalance = () => {
    if (!isConnected || !accountBalances) return 0;
    // Use minimum of free balances (limiting factor for arbitrage)
    return Math.min(
      accountBalances.bybit.free || 0,
      accountBalances.hyperliquid.free || 0
    );
  };

  const availableBalance = getAvailableBalance();
  const maxPositionSize = Math.floor(availableBalance * 0.97); // Use 95% as safety margin

  // Get available pairs from real data (only when connected)
  const availablePairs = isConnected && arbitrageData?.pairs
    ? arbitrageData.pairs
        .filter((pair) => pair.bybit.available) // Only show pairs available on Bybit
        .map((pair) => pair.pair)
    : [];

  // Get current pair data for calculations (only when connected)
  const currentPairData = isConnected && arbitrageData?.pairs
    ? arbitrageData.pairs.find((pair) => pair.pair === selectedPair)
    : null;

  // Calculate trade preview when amount, pair, or data changes
  useEffect(() => {
    if (amount && selectedPair && parseFloat(amount) > 0 && currentPairData) {
      const amountNum = parseFloat(amount);
      const fundingRate = currentPairData.funding_rate;

      // Calculate estimated 8-hour profit based on HOURLY funding rate
      // fundingRate is hourly rate in decimal format (e.g., 0.000013 = 0.0013% per hour)
      // For 8-hour period: multiply hourly rate by 8
      const eightHourProfit = amountNum * fundingRate * 8;
      const expectedProfit = eightHourProfit; // Estimated for next 8-hour funding period
      
      // Estimate fees based on actual exchange rates
      const hyperliquidFee = amountNum * 0.00015; // 0.015% maker fee (limit order for short position)
      const bybitFee = amountNum * 0.001; // 0.1% spot market buy fee
      const totalFees = hyperliquidFee + bybitFee;
      
      // Calculate NET PnL for different timeframes (gross profit - fees)
      const hourlyProfit = amountNum * fundingRate;
      const pnlTimeframes = {
        eightHour: (hourlyProfit * 8) - totalFees,
        oneDay: (hourlyProfit * 24) - totalFees,
        threeDays: (hourlyProfit * 24 * 3) - totalFees,
        oneWeek: (hourlyProfit * 24 * 7) - totalFees
      };

      const preview: TradePreview = {
        estimatedProfit: expectedProfit,
        fees: {
          hyperliquid: hyperliquidFee,
          bybit: bybitFee,
          total: totalFees
        },
        netProfit: expectedProfit - totalFees,
        roi: (expectedProfit / amountNum) * 100,
        pnlTimeframes
      };
      setTradePreview(preview);
    } else {
      setTradePreview(null);
    }
  }, [amount, selectedPair, currentPairData]);

  const handlePercentageClick = (percentage: number) => {
    const newAmount = (availableBalance * percentage / 100).toString();
    setAmount(newAmount);
  };

  const handleExecute = async () => {
    if (!amount || !selectedPair) return;
    
    setIsExecuting(true);
    setTradeError(null);
    
    try {
      const result = await openPosition(selectedPair, parseFloat(amount));
      
      if (result.success) {
        // Call the original callback for UI updates
      onExecuteTrade({
        pair: selectedPair,
        amount: parseFloat(amount),
        currency
      });
      setAmount('');
        console.log('✅ Trade executed successfully:', result.message);
      } else {
        setTradeError(result.error || result.message);
        console.error('❌ Trade execution failed:', result.error || result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setTradeError(errorMessage);
      console.error('❌ Trade execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const isValidTrade = amount && 
                     parseFloat(amount) > 0 && 
                     selectedPair && 
                     parseFloat(amount) <= availableBalance &&
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
            {availablePairs.map((pair: string) => (
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
              8h Funding rate: {(currentPairData.funding_rate * 100 * 8).toFixed(4)}% 
              ({currentPairData.annual_funding_rate.toFixed(2)}% APY)
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
              step="0.01"
              min="0"
              max={maxPositionSize}
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
        
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-text-secondary">
              Available: {availableBalance.toLocaleString()} USDT
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
          
          {/* Account Balances Display - Only show when connected */}
          {isConnected && isLoading ? (
            <div className="bg-white/5 rounded-lg border border-white/10 p-3 space-y-2 animate-pulse">
              <div className="text-xs font-medium text-white mb-2">Account Balances</div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-cyan-400 font-medium mb-1">HyperLiquid</div>
                  <div className="space-y-1">
                    {Array.from({ length: 3 }, (_, i) => (
                      <div key={i} className="flex justify-between">
                        <div className="h-3 bg-white/10 rounded w-12"></div>
                        <div className="h-3 bg-white/10 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-orange-400 font-medium mb-1">Bybit</div>
                  <div className="space-y-1">
                    {Array.from({ length: 3 }, (_, i) => (
                      <div key={i} className="flex justify-between">
                        <div className="h-3 bg-white/10 rounded w-12"></div>
                        <div className="h-3 bg-white/10 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-white/10 rounded w-24"></div>
                  <div className="h-3 bg-white/10 rounded w-20"></div>
                </div>
                <div className="h-2 bg-white/5 rounded w-full mt-1"></div>
              </div>
            </div>
          ) : isConnected && accountBalances ? (
            <div className="bg-white/5 rounded-lg border border-white/10 p-3 space-y-2">
              <div className="text-xs font-medium text-white mb-2">Account Balances</div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-cyan-400 font-medium mb-1">HyperLiquid</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Total:</span>
                      <span className="text-white font-mono">${accountBalances.hyperliquid.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Free:</span>
                      <span className="text-green-400 font-mono">${accountBalances.hyperliquid.free.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Used:</span>
                      <span className="text-orange-400 font-mono">${accountBalances.hyperliquid.used.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="text-orange-400 font-medium mb-1">Bybit</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Total:</span>
                      <span className="text-white font-mono">${accountBalances.bybit.total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Free:</span>
                      <span className="text-green-400 font-mono">${accountBalances.bybit.free.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Used:</span>
                      <span className="text-orange-400 font-mono">${accountBalances.bybit.used.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-2 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary text-xs">Max Position Size:</span>
                  <span className="text-accent font-mono font-bold">${maxPositionSize.toLocaleString()} USDT</span>
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  (Limited by minimum free balance: ${Math.min(accountBalances.bybit.free, accountBalances.hyperliquid.free).toLocaleString()})
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Trade Preview */}
      {tradePreview && currentPairData && (
        <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
          <h3 className="text-sm font-medium text-white">Trade Preview</h3>
          
          {/* Fee Breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Fee Breakdown:</span>
              <span className="text-error font-mono font-bold">-${tradePreview.fees.total.toFixed(2)}</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">HyperLiquid (0.015%):</span>
                <span className="text-white font-mono">${tradePreview.fees.hyperliquid.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Bybit (0.10%):</span>
                <span className="text-white font-mono">${tradePreview.fees.bybit.toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* Profit Projections */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="text-sm text-text-secondary">💰 Net PnL by Timeframe (after fees):</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">8 Hours:</span>
                <span className={`font-mono font-bold ${tradePreview.pnlTimeframes.eightHour >= 0 ? 'text-success' : 'text-error'}`}>
                  {tradePreview.pnlTimeframes.eightHour >= 0 ? '+' : ''}${tradePreview.pnlTimeframes.eightHour.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">1 Day:</span>
                <span className={`font-mono font-bold ${tradePreview.pnlTimeframes.oneDay >= 0 ? 'text-success' : 'text-error'}`}>
                  {tradePreview.pnlTimeframes.oneDay >= 0 ? '+' : ''}${tradePreview.pnlTimeframes.oneDay.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">3 Days:</span>
                <span className={`font-mono font-bold ${tradePreview.pnlTimeframes.threeDays >= 0 ? 'text-success' : 'text-error'}`}>
                  {tradePreview.pnlTimeframes.threeDays >= 0 ? '+' : ''}${tradePreview.pnlTimeframes.threeDays.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">1 Week:</span>
                <span className={`font-mono font-bold ${tradePreview.pnlTimeframes.oneWeek >= 0 ? 'text-success' : 'text-error'}`}>
                  {tradePreview.pnlTimeframes.oneWeek >= 0 ? '+' : ''}${tradePreview.pnlTimeframes.oneWeek.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {tradeError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Trade Execution Failed</span>
          </div>
          <p className="text-red-300 text-sm mt-2">{tradeError}</p>
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
            : parseFloat(amount) > availableBalance
            ? 'Insufficient balance'
            : 'Please check your trade parameters'
          }
        </div>
      )}
    </div>
  );
} 