import { storage } from '../storage';
import { dexService } from './dexService';
import { blockchainService } from './blockchain';
import { type InsertArbitrageOpportunity } from '@shared/schema';

export interface ArbitrageOpportunityData {
  tokenA: string;
  tokenB: string;
  symbolA: string;
  symbolB: string;
  dexA: string;
  dexB: string;
  priceA: number;
  priceB: number;
  profitAmount: number;
  profitPercent: number;
  minCapital: number;
  gasEstimate: number;
  network: string;
}

export class ArbitrageScanner {
  private scanningInterval: NodeJS.Timeout | null = null;
  private isScanning = false;

  // Popular token pairs for arbitrage scanning (network-specific addresses)
  private getTokenPairsForNetwork(network: string) {
    switch (network) {
      case 'ethereum':
        return [
          {
            symbolA: 'ETH',
            symbolB: 'USDC',
            addressA: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            addressB: '0xA0b86a33E6417faCf2bDc6e5Bd3dd1c83c4E8d5a',
          },
          {
            symbolA: 'WBTC',
            symbolB: 'USDT',
            addressA: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
            addressB: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          },
        ];
      case 'base':
        return [
          {
            symbolA: 'ETH',
            symbolB: 'USDC',
            addressA: '0x4200000000000000000000000000000000000006', // Base WETH
            addressB: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
          },
        ];
      case 'polygon':
        return [
          {
            symbolA: 'WETH',
            symbolB: 'USDC',
            addressA: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // Polygon WETH
            addressB: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon USDC
          },
        ];
      default:
        return [];
    }
  }

  private dexes = ['1inch', '0x', 'Uniswap V3', 'Sushiswap', 'Curve', 'Balancer'];

  startScanning(intervalMs: number = 5000): void {
    if (this.scanningInterval) {
      this.stopScanning();
    }

    console.log('🔍 Starting arbitrage opportunity scanning...');
    this.isScanning = true;
    
    // Initial scan
    this.scanForOpportunities();
    
    // Set up periodic scanning
    this.scanningInterval = setInterval(() => {
      this.scanForOpportunities();
    }, intervalMs);
  }

  stopScanning(): void {
    if (this.scanningInterval) {
      clearInterval(this.scanningInterval);
      this.scanningInterval = null;
    }
    this.isScanning = false;
    console.log('⏹️ Stopped arbitrage opportunity scanning');
  }

  private async scanForOpportunities(): Promise<void> {
    if (!this.isScanning) return;

    try {
      const networks = blockchainService.getNetworks();
      
      for (const network of networks) {
        await this.scanNetworkForOpportunities(network.name, network.chainId);
      }
    } catch (error) {
      console.error('Error during arbitrage scanning:', error);
    }
  }

  private async scanNetworkForOpportunities(networkName: string, chainId: number): Promise<void> {
    try {
      const networkStatus = await blockchainService.getNetworkStatus(networkName);
      if (!networkStatus.isActive) return;

      const tokenPairs = this.getTokenPairsForNetwork(networkName);
      for (const pair of tokenPairs) {
        await this.findArbitrageOpportunity(networkName, chainId, pair);
      }
    } catch (error) {
      console.error(`Error scanning ${networkName}:`, error);
    }
  }

  private async findArbitrageOpportunity(
    network: string,
    chainId: number,
    pair: { symbolA: string; symbolB: string; addressA: string; addressB: string }
  ): Promise<void> {
    try {
      const amount = "1000000000000000000"; // 1 token for price comparison

      // Get quotes from different DEXes
      const [oneInchQuote, zeroXQuote] = await Promise.all([
        dexService.get1InchQuote(chainId, pair.addressA, pair.addressB, amount),
        dexService.get0xQuote(chainId, pair.addressA, pair.addressB, amount)
      ]);

      if (!oneInchQuote || !zeroXQuote) return;

      const price1inch = parseFloat(oneInchQuote.price);
      const price0x = parseFloat(zeroXQuote.price);

      // Calculate potential arbitrage
      if (Math.abs(price1inch - price0x) > 0) {
        const priceDiff = Math.abs(price1inch - price0x);
        const avgPrice = (price1inch + price0x) / 2;
        const profitPercent = (priceDiff / avgPrice) * 100;

        // Only consider opportunities above threshold
        if (profitPercent >= 0.5) {
          const opportunity = this.createOpportunityData(
            network,
            pair,
            price1inch,
            price0x,
            profitPercent,
            parseInt(oneInchQuote.estimatedGas)
          );

          await this.saveOpportunity(opportunity);
        }
      }
    } catch (error) {
      console.error(`Error finding arbitrage for ${pair.symbolA}/${pair.symbolB} on ${network}:`, error);
    }
  }

  private createOpportunityData(
    network: string,
    pair: { symbolA: string; symbolB: string; addressA: string; addressB: string },
    price1inch: number,
    price0x: number,
    profitPercent: number,
    gasEstimate: number
  ): ArbitrageOpportunityData {
    const priceDiff = Math.abs(price1inch - price0x);
    const minCapital = Math.max(10000, priceDiff * 1000); // Estimate minimum capital needed
    
    // Determine which DEX has better price
    const isBuyOnOneInch = price1inch < price0x;
    
    return {
      tokenA: pair.addressA,
      tokenB: pair.addressB,
      symbolA: pair.symbolA,
      symbolB: pair.symbolB,
      dexA: isBuyOnOneInch ? '1inch' : '0x Protocol',
      dexB: isBuyOnOneInch ? '0x Protocol' : '1inch',
      priceA: isBuyOnOneInch ? price1inch : price0x,
      priceB: isBuyOnOneInch ? price0x : price1inch,
      profitAmount: priceDiff * 100, // Simulate profit for 100 units
      profitPercent,
      minCapital,
      gasEstimate,
      network,
    };
  }

  private async saveOpportunity(opportunity: ArbitrageOpportunityData): Promise<void> {
    try {
      const insertData: InsertArbitrageOpportunity = {
        tokenA: opportunity.tokenA,
        tokenB: opportunity.tokenB,
        dexA: opportunity.dexA,
        dexB: opportunity.dexB,
        priceA: opportunity.priceA.toString(),
        priceB: opportunity.priceB.toString(),
        profitAmount: opportunity.profitAmount.toString(),
        profitPercent: opportunity.profitPercent.toString(),
        minCapital: opportunity.minCapital.toString(),
        gasEstimate: opportunity.gasEstimate.toString(),
        network: opportunity.network,
        expiresAt: new Date(Date.now() + 30000), // Expire in 30 seconds
      };

      await storage.createOpportunity(insertData);
      console.log(`💰 Found arbitrage: ${opportunity.symbolA}/${opportunity.symbolB} - ${opportunity.profitPercent.toFixed(2)}% profit`);
    } catch (error) {
      console.error('Error saving opportunity:', error);
    }
  }

  async executeArbitrage(opportunityId: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const opportunities = await storage.getActiveOpportunities();
      const opportunity = opportunities.find(opp => opp.id === opportunityId);
      
      if (!opportunity) {
        return { success: false, error: 'Opportunity not found or expired' };
      }

      // Check if contract is deployed on this network
      if (!blockchainService.isContractDeployed(opportunity.network)) {
        return { success: false, error: `Smart contract not deployed on ${opportunity.network}` };
      }

      // Validate profit potential before execution
      const estimatedProfit = await blockchainService.estimateArbitrageProfit(
        opportunity.network,
        opportunity.tokenA,
        opportunity.tokenB,
        opportunity.minCapital,
        opportunity.dexA,
        opportunity.dexB
      );

      const profitThreshold = parseFloat(opportunity.profitAmount) * 0.8; // 80% of expected profit
      if (parseFloat(estimatedProfit) < profitThreshold) {
        return { success: false, error: 'Profit dropped below threshold' };
      }

      // Create trade record
      const trade = await storage.createTrade({
        opportunityId: opportunity.id,
        txHash: 'pending',
        tokenPair: `${opportunity.tokenA}/${opportunity.tokenB}`,
        profitAmount: opportunity.profitAmount,
        gasUsed: opportunity.gasEstimate,
        gasCost: "0",
        status: 'pending',
        network: opportunity.network,
        details: {
          dexA: opportunity.dexA,
          dexB: opportunity.dexB,
          priceA: opportunity.priceA,
          priceB: opportunity.priceB,
          contractAddress: blockchainService.getContractAddress(opportunity.network),
          estimatedProfit: estimatedProfit
        },
      });

      try {
        // Execute the real arbitrage transaction via smart contract
        const txHash = await blockchainService.executeArbitrageTransaction(
          opportunity.network,
          opportunity.tokenA,
          opportunity.tokenB,
          opportunity.minCapital,
          opportunity.dexA,
          opportunity.dexB,
          Math.floor(profitThreshold).toString() // Minimum profit requirement
        );

        // Update trade status
        await storage.updateTradeStatus(trade.id, 'success', txHash);
        await storage.updateOpportunityStatus(opportunity.id, false);

        console.log(`✅ Real arbitrage executed successfully: ${txHash}`);
        console.log(`💰 Expected profit: ${estimatedProfit} tokens`);
        return { success: true, txHash };
      } catch (error) {
        await storage.updateTradeStatus(trade.id, 'failed');
        console.error('Arbitrage execution failed:', error);
        
        // Provide more detailed error information
        const errorMessage = error instanceof Error ? error.message : 'Execution failed';
        const isRevertError = errorMessage.includes('revert') || errorMessage.includes('insufficient');
        
        return { 
          success: false, 
          error: isRevertError ? 'Transaction would fail - insufficient profit or liquidity' : errorMessage 
        };
      }
    } catch (error) {
      console.error('Error executing arbitrage:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }
}

export const arbitrageScanner = new ArbitrageScanner();
