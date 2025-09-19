interface TradingStatsProps {
  stats: {
    totalProfit: number;
    totalTrades: number;
    successRate: number;
    dailyProfit: number;
  };
}

export default function TradingStats({ stats }: TradingStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Daily Profit */}
      <div className="bg-card rounded-lg border border-border p-6" data-testid="stat-daily-profit">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Profit (24h)</p>
            <p className="text-2xl font-bold profit">${stats.dailyProfit.toFixed(2)}</p>
          </div>
          <i className="fas fa-chart-line text-primary text-xl"></i>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="profit">+12.3%</span> from yesterday
        </div>
      </div>

      {/* Active Opportunities */}
      <div className="bg-card rounded-lg border border-border p-6" data-testid="stat-active-opportunities">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Active Opportunities</p>
            <p className="text-2xl font-bold text-accent">24</p>
          </div>
          <i className="fas fa-eye text-accent text-xl"></i>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="profit">+3</span> new this hour
        </div>
      </div>

      {/* Success Rate */}
      <div className="bg-card rounded-lg border border-border p-6" data-testid="stat-success-rate">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Success Rate</p>
            <p className="text-2xl font-bold text-primary">{stats.successRate.toFixed(1)}%</p>
          </div>
          <i className="fas fa-check-circle text-primary text-xl"></i>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {Math.round(stats.successRate * stats.totalTrades / 100)}/{stats.totalTrades} successful trades
        </div>
      </div>

      {/* Contract Status */}
      <div className="bg-card rounded-lg border border-border p-6" data-testid="stat-contract-status">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Smart Contracts</p>
            <p className="text-2xl font-bold text-primary">LIVE</p>
          </div>
          <i className="fas fa-shield-alt text-primary text-xl"></i>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Real flash loan execution
        </div>
      </div>
    </div>
  );
}
