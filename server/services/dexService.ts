import axios from 'axios';

export interface TokenPrice {
  symbol: string;
  address: string;
  price: number;
  dex: string;
}

export interface QuoteResponse {
  price: string;
  estimatedGas: string;
  sellAmount: string;
  buyAmount: string;
  allowanceTarget?: string;
  to?: string;
  data?: string;
}

export class DEXService {
  private oneInchApiKey: string;
  private zeroXApiKey: string;

  constructor() {
    this.oneInchApiKey = process.env.ONEINCH_API_KEY || 'lpwFR7CGsw43B6ywnRf7b0NqYJD7T22K';
    this.zeroXApiKey = process.env.ZEROX_API_KEY || process.env.OX_API_KEY || '101023a6-8d79-4133-9abf-c7c5369e7008';
  }

  async get1InchQuote(
    chainId: number,
    fromToken: string,
    toToken: string,
    amount: string
  ): Promise<QuoteResponse | null> {
    try {
      const response = await axios.get(
        `https://api.1inch.io/v5.0/${chainId}/quote`,
        {
          params: {
            fromTokenAddress: fromToken,
            toTokenAddress: toToken,
            amount: amount,
          },
          headers: {
            'Authorization': `Bearer ${this.oneInchApiKey}`,
          },
        }
      );

      return {
        price: response.data.toTokenAmount,
        estimatedGas: response.data.estimatedGas || "200000",
        sellAmount: amount,
        buyAmount: response.data.toTokenAmount,
      };
    } catch (error) {
      console.error('1inch API error:', error);
      return null;
    }
  }

  async get0xQuote(
    chainId: number,
    sellToken: string,
    buyToken: string,
    sellAmount: string
  ): Promise<QuoteResponse | null> {
    try {
      const baseUrl = this.get0xBaseUrl(chainId);
      const response = await axios.get(`${baseUrl}/swap/v1/quote`, {
        params: {
          sellToken,
          buyToken,
          sellAmount,
        },
        headers: {
          '0x-api-key': this.zeroXApiKey,
        },
      });

      return {
        price: response.data.buyAmount,
        estimatedGas: response.data.estimatedGas || "200000",
        sellAmount,
        buyAmount: response.data.buyAmount,
        allowanceTarget: response.data.allowanceTarget,
        to: response.data.to,
        data: response.data.data,
      };
    } catch (error) {
      console.error('0x API error:', error);
      return null;
    }
  }

  private get0xBaseUrl(chainId: number): string {
    switch (chainId) {
      case 1: return 'https://api.0x.org';
      case 137: return 'https://polygon.api.0x.org';
      case 8453: return 'https://base.api.0x.org';
      default: return 'https://api.0x.org';
    }
  }

  async getTokenPrices(chainId: number, tokens: string[]): Promise<TokenPrice[]> {
    const prices: TokenPrice[] = [];
    
    // Use popular, liquid token pairs that are guaranteed to exist
    const validTokenPairs = this.getValidTokenPairs(chainId);

    for (const tokenPair of validTokenPairs) {
      try {
        const amount = "1000000000000000000"; // 1 token

        const [oneInchQuote, zeroXQuote] = await Promise.all([
          this.get1InchQuote(chainId, tokenPair.tokenA, tokenPair.tokenB, amount),
          this.get0xQuote(chainId, tokenPair.tokenA, tokenPair.tokenB, amount)
        ]);

        if (oneInchQuote) {
          prices.push({
            symbol: tokenPair.symbolA,
            address: tokenPair.tokenA,
            price: parseFloat(oneInchQuote.price) / 1e18,
            dex: '1inch'
          });
        }

        if (zeroXQuote) {
          prices.push({
            symbol: tokenPair.symbolA,
            address: tokenPair.tokenA,
            price: parseFloat(zeroXQuote.price) / 1e18,
            dex: '0x'
          });
        }
      } catch (error) {
        console.error(`Error fetching price for token pair:`, error);
      }
    }

    return prices;
  }

  private getValidTokenPairs(chainId: number) {
    switch (chainId) {
      case 1: // Ethereum
        return [
          { tokenA: '0xA0b86a33E6441f8C0362fC4c92AaE6d1E2d50a27', tokenB: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbolA: 'USDC', symbolB: 'WETH' },
          { tokenA: '0xdAC17F958D2ee523a2206206994597C13D831ec7', tokenB: '0xA0b86a33E6441f8C0362fC4c92AaE6d1E2d50a27', symbolA: 'USDT', symbolB: 'USDC' },
        ];
      case 137: // Polygon
        return [
          { tokenA: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', tokenB: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', symbolA: 'USDC', symbolB: 'WETH' },
        ];
      case 8453: // Base
        return [
          { tokenA: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', tokenB: '0x4200000000000000000000000000000000000006', symbolA: 'USDC', symbolB: 'WETH' },
        ];
      default:
        return [];
    }
  }

  private getWETHAddress(chainId: number): string {
    switch (chainId) {
      case 1: return '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // Ethereum WETH
      case 137: return '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'; // Polygon WETH
      case 8453: return '0x4200000000000000000000000000000000000006'; // Base WETH
      default: return '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    }
  }

  async executeSwap(
    chainId: number,
    sellToken: string,
    buyToken: string,
    sellAmount: string,
    slippagePercentage: number = 1
  ): Promise<any> {
    try {
      const baseUrl = this.get0xBaseUrl(chainId);
      const response = await axios.get(`${baseUrl}/swap/v1/quote`, {
        params: {
          sellToken,
          buyToken,
          sellAmount,
          slippagePercentage,
        },
        headers: {
          '0x-api-key': this.zeroXApiKey,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error executing swap:', error);
      throw error;
    }
  }
}

export const dexService = new DEXService();
