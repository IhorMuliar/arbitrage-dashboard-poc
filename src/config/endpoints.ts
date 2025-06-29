// eslint-disable-next-line @typescript-eslint/no-unused-vars
const isDevelopment = process.env.NODE_ENV === 'development';

// Server URLs
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765';

export const endpoints = {
  api: {
    base: API_BASE,
    funding: '/api/funding',
    trade: '/api/trade',
    positions: '/api/positions',
    balances: '/api/balances',
    closePosition: '/api/position/close'
  },
  ws: {
    base: WS_BASE
  }
}; 