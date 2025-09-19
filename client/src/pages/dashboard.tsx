import { useWebSocket } from '@/hooks/useWebSocket';
import TradingStats from '@/components/TradingStats';
import ArbitrageOpportunities from '@/components/ArbitrageOpportunities';
import RecentTrades from '@/components/RecentTrades';
import QuickSettings from '@/components/QuickSettings';
import PerformanceAnalytics from '@/components/PerformanceAnalytics';
import { WalletInfo } from "@/components/WalletInfo";

export default function Dashboard() {
  const { data, isConnected } = useWebSocket();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <i className="fas fa-bolt text-accent text-xl"></i>
              <h1 className="text-xl font-bold text-foreground">FlashArbitrage Pro</h1>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-primary animate-pulse' : 'bg-destructive'}`}></span>
              <span>{isConnected ? 'Live Scanning' : 'Disconnected'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Network Status */}
            <div className="flex items-center space-x-4">
              {data.networks.map((network) => (
                <div key={network.id} className="flex items-center space-x-2" data-testid={`network-status-${network.network}`}>
                  <span className={`w-2 h-2 rounded-full ${network.isActive ? 'bg-primary' : 'bg-accent'}`}></span>
                  <span className="text-sm text-muted-foreground capitalize">{network.network}</span>
                </div>
              ))}
            </div>

            {/* User Account */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium font-mono" data-testid="user-address">
                  {data.walletAddress ? 
                    `${data.walletAddress.slice(0, 6)}...${data.walletAddress.slice(-4)}` : 
                    'Not Connected'
                  }
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.walletAddress ? 'Connected' : 'No Wallet'}
                </div>
              </div>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <i className="fas fa-user text-primary-foreground text-sm"></i>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6">
        {/* Dashboard Stats */}
        <TradingStats stats={data.stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Arbitrage Opportunities */}
          <div className="lg:col-span-2">
            <ArbitrageOpportunities opportunities={data.opportunities} />
          </div>

          {/* Trading Activity & Settings */}
          <div className="space-y-6">
            <RecentTrades trades={data.recentTrades} />
            <WalletInfo />
            <QuickSettings />
          </div>
        </div>

        {/* Performance Analytics */}
        <PerformanceAnalytics stats={data.stats} />
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border px-6 py-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>© 2024 FlashArbitrage Pro</span>
            <span>•</span>
            <span>Connected to {data.networks.filter(n => n.isActive).length} networks</span>
            <span>•</span>
            <span>Gas: <span className="font-mono">{Math.round(Number(data.networks[0]?.gasPrice || 0) / 1e9)} Gwei</span></span>
          </div>
          <div className="flex items-center space-x-2">
            <i className="fas fa-shield-alt text-primary"></i>
            <span>Secure Connection</span>
          </div>
        </div>
      </footer>
    </div>
  );
}