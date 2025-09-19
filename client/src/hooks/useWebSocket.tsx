import { useEffect, useRef, useState } from 'react';
import { type ArbitrageOpportunity, type Trade } from '@shared/schema';

export interface WebSocketData {
  opportunities: ArbitrageOpportunity[];
  recentTrades: Trade[];
  stats: {
    totalProfit: number;
    totalTrades: number;
    successRate: number;
    dailyProfit: number;
  };
  networks: Array<{
    id: string;
    network: string;
    isActive: boolean;
    blockNumber: string;
    gasPrice: string;
    lastUpdate: Date;
  }>;
}

export function useWebSocket() {
  const [data, setData] = useState<WebSocketData>({
    opportunities: [],
    recentTrades: [],
    stats: { totalProfit: 0, totalTrades: 0, successRate: 0, dailyProfit: 0 },
    networks: [],
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connectWebSocket = () => {
      try {
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onopen = () => {
          console.log('✅ WebSocket connected');
          setIsConnected(true);
        };

        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
              case 'initial':
                setData(message.data);
                break;
              case 'opportunities':
                setData(prev => ({ ...prev, opportunities: message.data }));
                break;
              case 'stats':
                setData(prev => ({ ...prev, stats: message.data }));
                break;
              case 'networks':
                setData(prev => ({ ...prev, networks: message.data }));
                break;
              case 'tradeExecuted':
                // Handle trade execution notification
                console.log('Trade executed:', message.data);
                break;
              default:
                console.log('Unknown message type:', message.type);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        wsRef.current.onclose = () => {
          console.log('❌ WebSocket disconnected');
          setIsConnected(false);
          
          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { data, isConnected };
}
