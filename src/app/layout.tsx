'use client';

import "./globals.css";
import { WebSocketProvider } from '../hooks/useWebSocket';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WebSocketProvider>
        {children}
        </WebSocketProvider>
      </body>
    </html>
  );
}
