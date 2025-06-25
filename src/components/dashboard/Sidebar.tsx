interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-[280px] h-screen bg-secondary border-r border-white/10 flex flex-col">
      {/* Brand Logo */}
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold"><span className="text-accent">ICON</span> Trading</h1>
      </div>

      {/* Navigation Tabs */}
      <div className="flex-1 p-4">
        <nav className="space-y-2">
          <TabButton
            label="Manual"
            active={activeTab === 'manual'}
            disabled={false}
            onClick={() => onTabChange('manual')}
          />
          <TabButton
            label="Automatic"
            active={activeTab === 'automatic'}
            disabled={true}
            onClick={() => onTabChange('automatic')}
          />
          <TabButton
            label="Backtesting"
            active={activeTab === 'backtesting'}
            disabled={true}
            onClick={() => onTabChange('backtesting')}
          />
        </nav>
      </div>

      {/* System Status */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-text-secondary">Exchange Status</h3>
          <StatusIndicator label="HyperLiquid" status="connected" />
          <StatusIndicator label="Bybit" status="connected" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-text-secondary">Wallet</h3>
          <p className="text-xs text-success font-mono">
            0x1234...5678
          </p>
        </div>
      </div>
    </div>
  );
}

interface TabButtonProps {
  label: string;
  icon?: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}

function TabButton({ label, icon, active, disabled, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
        active
          ? 'bg-accent/20 text-accent border border-accent/30 neon-glow'
          : disabled
          ? 'text-gray-500 cursor-not-allowed'
          : 'text-text-secondary hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span className="font-medium">{label}</span>
    </button>
  );
}

interface StatusIndicatorProps {
  label: string;
  status: 'connected' | 'disconnected' | 'error';
}

function StatusIndicator({ label, status }: StatusIndicatorProps) {
  const statusColors = {
    connected: 'text-success',
    disconnected: 'text-warning',
    error: 'text-error'
  };

  const statusIcons = {
    connected: '●',
    disconnected: '●',
    error: '●'
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="flex items-center gap-1">
        <span className={`${statusColors[status]} text-xs`}>
          {statusIcons[status]}
        </span>
        <span className="text-xs text-text-secondary capitalize">{status}</span>
      </div>
    </div>
  );
} 