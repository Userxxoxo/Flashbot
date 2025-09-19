interface PerformanceAnalyticsProps {
  stats: {
    totalProfit: number;
    totalTrades: number;
    successRate: number;
    dailyProfit: number;
  };
}

export default function PerformanceAnalytics({ stats }: PerformanceAnalyticsProps) {
  const avgProfit = stats.totalTrades > 0 ? stats.totalProfit / stats.totalTrades : 0;

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold">Performance Analytics</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center" data-testid="analytics-total-profit">
            <div className="text-2xl font-bold profit">${stats.totalProfit.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Total Profit (All Time)</div>
          </div>
          <div className="text-center" data-testid="analytics-total-trades">
            <div className="text-2xl font-bold text-foreground">{stats.totalTrades.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Trades Executed</div>
          </div>
          <div className="text-center" data-testid="analytics-avg-profit">
            <div className="text-2xl font-bold text-accent">${avgProfit.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Average Profit per Trade</div>
          </div>
        </div>
        
        <div className="mt-6 h-64 bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <i className="fas fa-chart-area text-2xl mb-2"></i>
            <div>Profit/Loss Chart</div>
            <div className="text-xs">Real-time performance visualization</div>
          </div>
        </div>
      </div>
    </div>
  );
}
