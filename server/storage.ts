import { 
  type ArbitrageOpportunity, 
  type InsertArbitrageOpportunity,
  type Trade,
  type InsertTrade,
  type TradingSettings,
  type InsertTradingSettings,
  type NetworkStatus,
  type InsertNetworkStatus
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Arbitrage Opportunities
  getActiveOpportunities(): Promise<ArbitrageOpportunity[]>;
  createOpportunity(opportunity: InsertArbitrageOpportunity): Promise<ArbitrageOpportunity>;
  updateOpportunityStatus(id: string, isActive: boolean): Promise<void>;
  
  // Trades
  getTrades(limit?: number): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTradeStatus(id: string, status: string, txHash?: string): Promise<void>;
  getTradesStats(): Promise<{
    totalProfit: number;
    totalTrades: number;
    successRate: number;
    dailyProfit: number;
  }>;
  
  // Trading Settings
  getTradingSettings(userId: string): Promise<TradingSettings | undefined>;
  updateTradingSettings(userId: string, settings: Partial<InsertTradingSettings>): Promise<TradingSettings>;
  
  // Network Status
  getNetworkStatuses(): Promise<NetworkStatus[]>;
  updateNetworkStatus(network: string, status: Partial<InsertNetworkStatus>): Promise<NetworkStatus>;
}

export class MemStorage implements IStorage {
  private opportunities: Map<string, ArbitrageOpportunity> = new Map();
  private trades: Map<string, Trade> = new Map();
  private settings: Map<string, TradingSettings> = new Map();
  private networkStatuses: Map<string, NetworkStatus> = new Map();

  constructor() {
    // Initialize default network statuses
    const networks = ['ethereum', 'base', 'polygon'];
    networks.forEach(network => {
      const status: NetworkStatus = {
        id: randomUUID(),
        network,
        isActive: true,
        blockNumber: "0",
        gasPrice: network === 'ethereum' ? "42000000000" : "1000000000",
        lastUpdate: new Date(),
      };
      this.networkStatuses.set(network, status);
    });
  }

  async getActiveOpportunities(): Promise<ArbitrageOpportunity[]> {
    const now = new Date();
    return Array.from(this.opportunities.values())
      .filter(opp => opp.isActive && new Date(opp.expiresAt) > now)
      .sort((a, b) => parseFloat(b.profitAmount) - parseFloat(a.profitAmount));
  }

  async createOpportunity(insertOpportunity: InsertArbitrageOpportunity): Promise<ArbitrageOpportunity> {
    const id = randomUUID();
    const opportunity: ArbitrageOpportunity = {
      ...insertOpportunity,
      id,
      isActive: true,
      createdAt: new Date(),
    };
    this.opportunities.set(id, opportunity);
    return opportunity;
  }

  async updateOpportunityStatus(id: string, isActive: boolean): Promise<void> {
    const opportunity = this.opportunities.get(id);
    if (opportunity) {
      opportunity.isActive = isActive;
      this.opportunities.set(id, opportunity);
    }
  }

  async getTrades(limit: number = 50): Promise<Trade[]> {
    return Array.from(this.trades.values())
      .sort((a, b) => new Date(b.executedAt || 0).getTime() - new Date(a.executedAt || 0).getTime())
      .slice(0, limit);
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = randomUUID();
    const trade: Trade = {
      ...insertTrade,
      id,
      executedAt: new Date(),
      details: insertTrade.details || null,
      opportunityId: insertTrade.opportunityId || null,
    };
    this.trades.set(id, trade);
    return trade;
  }

  async updateTradeStatus(id: string, status: string, txHash?: string): Promise<void> {
    const trade = this.trades.get(id);
    if (trade) {
      trade.status = status;
      if (txHash) trade.txHash = txHash;
      this.trades.set(id, trade);
    }
  }

  async getTradesStats(): Promise<{
    totalProfit: number;
    totalTrades: number;
    successRate: number;
    dailyProfit: number;
  }> {
    const allTrades = Array.from(this.trades.values());
    const successfulTrades = allTrades.filter(t => t.status === 'success');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyTrades = successfulTrades.filter(t => new Date(t.executedAt || 0) >= today);

    const totalProfit = successfulTrades.reduce((sum, trade) => sum + parseFloat(trade.profitAmount), 0);
    const dailyProfit = dailyTrades.reduce((sum, trade) => sum + parseFloat(trade.profitAmount), 0);

    return {
      totalProfit,
      totalTrades: allTrades.length,
      successRate: allTrades.length > 0 ? (successfulTrades.length / allTrades.length) * 100 : 0,
      dailyProfit,
    };
  }

  async getTradingSettings(userId: string): Promise<TradingSettings | undefined> {
    return this.settings.get(userId);
  }

  async updateTradingSettings(userId: string, settings: Partial<InsertTradingSettings>): Promise<TradingSettings> {
    const existing = this.settings.get(userId);
    const updated: TradingSettings = {
      id: existing?.id || randomUUID(),
      userId,
      minProfitThreshold: "1.5",
      maxGasPrice: "50",
      autoExecute: false,
      enabledNetworks: ['ethereum', 'base'],
      maxTradeAmount: "10000",
      updatedAt: new Date(),
      ...existing,
      ...settings,
    };
    this.settings.set(userId, updated);
    return updated;
  }

  async getNetworkStatuses(): Promise<NetworkStatus[]> {
    return Array.from(this.networkStatuses.values());
  }

  async updateNetworkStatus(network: string, status: Partial<InsertNetworkStatus>): Promise<NetworkStatus> {
    const existing = this.networkStatuses.get(network);
    const updated: NetworkStatus = {
      id: existing?.id || randomUUID(),
      network,
      isActive: true,
      blockNumber: "0",
      gasPrice: "1000000000",
      lastUpdate: new Date(),
      ...existing,
      ...status,
    };
    this.networkStatuses.set(network, updated);
    return updated;
  }
}

export const storage = new MemStorage();
