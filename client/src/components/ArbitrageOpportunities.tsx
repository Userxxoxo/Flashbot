import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { type ArbitrageOpportunity } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface ArbitrageOpportunitiesProps {
  opportunities: ArbitrageOpportunity[];
}

const tokenSymbols: Record<string, string> = {
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 'ETH',
  '0xA0b86a33E6417faCf2bDc6e5Bd3dd1c83c4E8d5a': 'USDC',
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': 'WBTC',
  '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984': 'UNI',
  '0xdAC17F958D2ee523a2206206994597C13D831ec7': 'USDT',
};

const tokenColors: Record<string, string> = {
  'ETH': 'bg-blue-500',
  'USDC': 'bg-green-500',
  'WBTC': 'bg-orange-500',
  'UNI': 'bg-purple-500',
  'USDT': 'bg-red-500',
  'DAI': 'bg-yellow-500',
};

export default function ArbitrageOpportunities({ opportunities }: ArbitrageOpportunitiesProps) {
  const [executingIds, setExecutingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const getTokenSymbol = (address: string): string => {
    return tokenSymbols[address] || address.slice(0, 6);
  };

  const executeArbitrage = async (opportunityId: string) => {
    setExecutingIds(prev => new Set(prev).add(opportunityId));
    
    try {
      const response = await apiRequest('POST', `/api/execute-arbitrage/${opportunityId}`);
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Arbitrage Executed",
          description: `Transaction hash: ${result.txHash.slice(0, 10)}...`,
        });
      } else {
        toast({
          title: "Execution Failed",
          description: result.error || "Failed to execute arbitrage",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Execution Error",
        description: "Network error occurred",
        variant: "destructive",
      });
    } finally {
      setExecutingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(opportunityId);
        return newSet;
      });
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Live Arbitrage Opportunities</h2>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">Updated 2s ago</span>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {opportunities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <i className="fas fa-search text-2xl mb-2"></i>
              <p>No arbitrage opportunities found</p>
              <p className="text-sm">Scanning for profitable trades...</p>
            </div>
          ) : (
            opportunities.slice(0, 5).map((opportunity) => {
              const tokenASymbol = getTokenSymbol(opportunity.tokenA);
              const tokenBSymbol = getTokenSymbol(opportunity.tokenB);
              const isExecuting = executingIds.has(opportunity.id);
              
              return (
                <div 
                  key={opportunity.id}
                  className="flex items-center justify-between p-4 bg-secondary rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
                  data-testid={`opportunity-${opportunity.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 ${tokenColors[tokenASymbol] || 'bg-gray-500'} rounded-full flex items-center justify-center text-white text-xs font-mono`}>
                        {tokenASymbol}
                      </div>
                      <i className="fas fa-arrow-right text-xs text-muted-foreground"></i>
                      <div className={`w-8 h-8 ${tokenColors[tokenBSymbol] || 'bg-gray-500'} rounded-full flex items-center justify-center text-white text-xs font-mono`}>
                        {tokenBSymbol}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium font-mono">{tokenASymbol}/{tokenBSymbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {opportunity.dexA} → {opportunity.dexB}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold profit font-mono">${parseFloat(opportunity.profitAmount).toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">
                      {parseFloat(opportunity.profitPercent).toFixed(2)}% profit
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Min Capital</div>
                    <div className="font-mono text-sm">${parseFloat(opportunity.minCapital).toLocaleString()}</div>
                  </div>
                  
                  <Button
                    onClick={() => executeArbitrage(opportunity.id)}
                    disabled={isExecuting}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    data-testid={`button-execute-${opportunity.id}`}
                  >
                    {isExecuting ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Executing...
                      </>
                    ) : (
                      'Execute'
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
