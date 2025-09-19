import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const arbitrageOpportunities = pgTable("arbitrage_opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenA: text("token_a").notNull(),
  tokenB: text("token_b").notNull(),
  dexA: text("dex_a").notNull(),
  dexB: text("dex_b").notNull(),
  priceA: decimal("price_a", { precision: 18, scale: 8 }).notNull(),
  priceB: decimal("price_b", { precision: 18, scale: 8 }).notNull(),
  profitAmount: decimal("profit_amount", { precision: 18, scale: 8 }).notNull(),
  profitPercent: decimal("profit_percent", { precision: 5, scale: 2 }).notNull(),
  minCapital: decimal("min_capital", { precision: 18, scale: 2 }).notNull(),
  gasEstimate: decimal("gas_estimate", { precision: 18, scale: 0 }).notNull(),
  network: text("network").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  opportunityId: varchar("opportunity_id").references(() => arbitrageOpportunities.id),
  txHash: text("tx_hash").notNull().unique(),
  tokenPair: text("token_pair").notNull(),
  profitAmount: decimal("profit_amount", { precision: 18, scale: 8 }).notNull(),
  gasUsed: decimal("gas_used", { precision: 18, scale: 0 }).notNull(),
  gasCost: decimal("gas_cost", { precision: 18, scale: 8 }).notNull(),
  status: text("status").notNull(), // 'pending', 'success', 'failed'
  network: text("network").notNull(),
  executedAt: timestamp("executed_at").defaultNow(),
  details: jsonb("details"),
});

export const tradingSettings = pgTable("trading_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().unique(),
  minProfitThreshold: decimal("min_profit_threshold", { precision: 5, scale: 2 }).default("1.5"),
  maxGasPrice: decimal("max_gas_price", { precision: 10, scale: 0 }).default("50"),
  autoExecute: boolean("auto_execute").default(false),
  enabledNetworks: jsonb("enabled_networks").$type<string[]>().default(['ethereum', 'base']),
  maxTradeAmount: decimal("max_trade_amount", { precision: 18, scale: 2 }).default("10000"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const networkStatus = pgTable("network_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  network: text("network").notNull().unique(),
  isActive: boolean("is_active").default(true),
  blockNumber: decimal("block_number", { precision: 18, scale: 0 }),
  gasPrice: decimal("gas_price", { precision: 18, scale: 0 }),
  lastUpdate: timestamp("last_update").defaultNow(),
});

export const insertArbitrageOpportunitySchema = createInsertSchema(arbitrageOpportunities).omit({
  id: true,
  createdAt: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  executedAt: true,
});

export const insertTradingSettingsSchema = createInsertSchema(tradingSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertNetworkStatusSchema = createInsertSchema(networkStatus).omit({
  id: true,
  lastUpdate: true,
});

export type ArbitrageOpportunity = typeof arbitrageOpportunities.$inferSelect;
export type InsertArbitrageOpportunity = z.infer<typeof insertArbitrageOpportunitySchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type TradingSettings = typeof tradingSettings.$inferSelect;
export type InsertTradingSettings = z.infer<typeof insertTradingSettingsSchema>;
export type NetworkStatus = typeof networkStatus.$inferSelect;
export type InsertNetworkStatus = z.infer<typeof insertNetworkStatusSchema>;
