import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { arbitrageScanner } from "./services/arbitrageScanner";
import { blockchainService } from "./services/blockchain";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize arbitrage scanner
  arbitrageScanner.startScanning(5000);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active WebSocket connections
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    console.log('Client connected to WebSocket');

    // Send initial data
    if (ws.readyState === WebSocket.OPEN) {
      sendInitialData(ws);
    }

    ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected from WebSocket');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Broadcast real-time updates to all connected clients
  const broadcastUpdate = (type: string, data: any) => {
    const message = JSON.stringify({ type, data });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Send updates every 3 seconds
  setInterval(async () => {
    try {
      const [opportunities, stats, networkStatuses] = await Promise.all([
        storage.getActiveOpportunities(),
        storage.getTradesStats(),
        storage.getNetworkStatuses(),
      ]);

      broadcastUpdate('opportunities', opportunities);
      broadcastUpdate('stats', stats);
      broadcastUpdate('networks', networkStatuses);
      broadcastUpdate('wallet', { walletAddress: blockchainService.getWalletAddress() });
    } catch (error) {
      console.error('Error broadcasting updates:', error);
    }
  }, 3000);

  async function sendInitialData(ws: WebSocket) {
    try {
      const [opportunities, trades, stats, networkStatuses] = await Promise.all([
        storage.getActiveOpportunities(),
        storage.getTrades(10),
        storage.getTradesStats(),
        storage.getNetworkStatuses(),
      ]);

      const initialData = {
        opportunities,
        recentTrades: trades,
        stats,
        networks: networkStatuses,
        walletAddress: blockchainService.getWalletAddress(),
      };

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'initial', data: initialData }));
      }
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  }

  // API Routes
  app.get('/api/opportunities', async (req, res) => {
    try {
      const opportunities = await storage.getActiveOpportunities();
      res.json(opportunities);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      res.status(500).json({ error: 'Failed to fetch opportunities' });
    }
  });

  app.get('/api/trades', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const trades = await storage.getTrades(limit);
      res.json(trades);
    } catch (error) {
      console.error('Error fetching trades:', error);
      res.status(500).json({ error: 'Failed to fetch trades' });
    }
  });

  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getTradesStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  app.get('/api/networks', async (req, res) => {
    try {
      const networks = await storage.getNetworkStatuses();
      res.json(networks);
    } catch (error) {
      console.error('Error fetching network status:', error);
      res.status(500).json({ error: 'Failed to fetch network status' });
    }
  });

  app.get('/api/wallet', async (req, res) => {
    try {
      const networks = blockchainService.getNetworks();
      const walletInfo = [];

      for (const network of networks) {
        const balance = await blockchainService.getWalletBalance(network.name);
        const contractAddress = blockchainService.getContractAddress(network.name);
        const isDeployed = blockchainService.isContractDeployed(network.name);

        walletInfo.push({
          network: network.name,
          chainId: network.chainId,
          nativeCurrency: network.nativeCurrency,
          balance,
          contractAddress,
          isDeployed
        });
      }

      res.json({
        walletAddress: blockchainService.getWalletAddress(),
        networks: walletInfo
      });
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      res.status(500).json({ error: 'Failed to fetch wallet info' });
    }
  });

  app.post('/api/execute-arbitrage/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await arbitrageScanner.executeArbitrage(id);
      
      if (result.success) {
        // Broadcast update to all clients
        broadcastUpdate('tradeExecuted', { opportunityId: id, txHash: result.txHash });
        res.json({ success: true, txHash: result.txHash });
      } else {
        res.status(400).json({ success: false, error: result.error });
      }
    } catch (error) {
      console.error('Error executing arbitrage:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  const settingsSchema = z.object({
    minProfitThreshold: z.string().optional(),
    maxGasPrice: z.string().optional(),
    autoExecute: z.boolean().optional(),
    enabledNetworks: z.array(z.string()).optional(),
    maxTradeAmount: z.string().optional(),
  });

  app.get('/api/settings/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      console.log('🔍 GET /api/settings:', userId);
      const settings = await storage.getTradingSettings(userId);
      console.log('📊 Retrieved settings:', settings);
      
      if (!settings) {
        // Create default settings
        const defaultSettings = await storage.updateTradingSettings(userId, {
          userId,
          minProfitThreshold: "1.5",
          maxGasPrice: "50",
          autoExecute: false,
          enabledNetworks: ['ethereum', 'base'],
          maxTradeAmount: "10000",
        });
        res.json(defaultSettings);
      } else {
        res.json(settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      console.log('📝 POST /api/settings:', userId, 'Body:', req.body);
      const validatedData = settingsSchema.parse(req.body);
      console.log('✅ Validated data:', validatedData);
      
      const updatedSettings = await storage.updateTradingSettings(userId, {
        userId,
        ...validatedData,
      });
      console.log('💾 Updated settings result:', updatedSettings);
      
      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid settings data', details: error.errors });
      } else {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
      }
    }
  });

  // Network status updates
  setInterval(async () => {
    try {
      const networks = blockchainService.getNetworks();
      for (const network of networks) {
        const status = await blockchainService.getNetworkStatus(network.name);
        await storage.updateNetworkStatus(network.name, status);
      }
    } catch (error) {
      console.error('Error updating network statuses:', error);
    }
  }, 10000); // Update every 10 seconds

  return httpServer;
}
