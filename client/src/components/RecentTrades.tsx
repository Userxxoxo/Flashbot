import { type Trade } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

interface RecentTradesProps {
  trades: Trade[];
}

export default function RecentTrades({ trades }: RecentTradesProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <i className="fas fa-check-circle text-primary" data-testid="status-success"></i>;
      case 'failed':
        return <i className="fas fa-times-circle text-destructive" data-testid="status-failed"></i>;
      case 'pending':
        return <i className="fas fa-clock text-accent" data-testid="status-pending"></i>;
      default:
        return <i className="fas fa-question-circle text-muted-foreground"></i>;
    }
  };

  const getStatusColor = (status: string, profit: number) => {
    if (status === 'failed') return 'loss';
    return profit >= 0 ? 'profit' : 'loss';
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Recent Trades</h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {trades.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>No trades yet</p>
            </div>
          ) : (
            trades.slice(0, 5).map((trade) => (
              <div key={trade.id} className="flex items-center justify-between" data-testid={`trade-${trade.id}`}>
                <div>
                  <div className="font-medium font-mono text-sm">{trade.tokenPair}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(trade.executedAt || 0))} ago
                  </div>
                </div>
                <div className="text-right">
                  <div className={`${getStatusColor(trade.status, parseFloat(trade.profitAmount))} font-mono text-sm`}>
                    {trade.status === 'failed' ? '-' : '+'}${Math.abs(parseFloat(trade.profitAmount)).toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {getStatusIcon(trade.status)}
                    <span className="capitalize">{trade.status}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {trades.length > 0 && (
          <button className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground" data-testid="button-view-all-trades">
            View All Trades
          </button>
        )}
      </div>
    </div>
  );
}
