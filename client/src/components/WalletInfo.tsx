
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WalletData {
  walletAddress?: string;
  networks: Array<{
    network: string;
    chainId: number;
    nativeCurrency: string;
    balance: string;
    contractAddress?: string;
    isDeployed: boolean;
  }>;
}

export function WalletInfo() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWalletInfo = async () => {
      try {
        const response = await fetch('/api/wallet');
        const data = await response.json();
        setWalletData(data);
      } catch (error) {
        console.error('Failed to fetch wallet info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletInfo();
    const interval = setInterval(fetchWalletInfo, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <i className="fas fa-wallet text-primary"></i>
            Wallet Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Loading wallet info...</div>
        </CardContent>
      </Card>
    );
  }

  if (!walletData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <i className="fas fa-wallet text-primary"></i>
            Wallet Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Failed to load wallet information</div>
        </CardContent>
      </Card>
    );
  }

  const formatAddress = (address?: string) => {
    if (!address) return 'Not available';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string, currency: string) => {
    const num = parseFloat(balance);
    if (num === 0) return `0 ${currency}`;
    if (num < 0.001) return `< 0.001 ${currency}`;
    return `${num.toFixed(4)} ${currency}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <i className="fas fa-wallet text-primary"></i>
          Wallet Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wallet Address */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground">Wallet Address</div>
          <div className="font-mono text-sm">
            {walletData.walletAddress || 'No wallet connected'}
          </div>
        </div>

        {/* Network Balances */}
        <div className="space-y-3">
          <h4 className="font-semibold">Network Balances & Contracts</h4>
          {walletData.networks.map((network) => (
            <div key={network.network} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize">{network.network}</span>
                  <Badge variant={network.isDeployed ? "default" : "secondary"}>
                    {network.isDeployed ? "Contract Deployed" : "No Contract"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Chain ID: {network.chainId}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Balance: </span>
                  <span className="font-medium">
                    {formatBalance(network.balance, network.nativeCurrency)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Contract: </span>
                  <span className="font-mono text-xs">
                    {formatAddress(network.contractAddress)}
                  </span>
                </div>
              </div>

              {network.contractAddress && (
                <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                  <div className="text-muted-foreground">Full Contract Address:</div>
                  <div className="font-mono break-all">{network.contractAddress}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Networks:</span>
            <span className="font-medium">{walletData.networks.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Deployed Contracts:</span>
            <span className="font-medium">
              {walletData.networks.filter(n => n.isDeployed).length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
