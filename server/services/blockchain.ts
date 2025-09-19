
import { ethers } from "ethers";
import fs from "fs";
import path from "path";

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  nativeCurrency: string;
  contractAddress?: string;
}

export interface ContractDeployment {
  contractAddress: string;
  deployerAddress: string;
  deploymentTime: string;
  transactionHash: string;
}

export class BlockchainService {
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private contracts: Map<string, ethers.Contract> = new Map();
  private wallet: ethers.Wallet | null = null;
  
  private networks: NetworkConfig[] = [
    {
      name: 'ethereum',
      rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
      chainId: 1,
      nativeCurrency: 'ETH'
    },
    {
      name: 'base',
      rpcUrl: process.env.ALCHEMY_API_URL_MAINNET || 'https://base-mainnet.g.alchemy.com/v2/ojgE-kLyhAaGG_uahr6F7Os9NnnJxH09',
      chainId: 8453,
      nativeCurrency: 'ETH'
    },
    {
      name: 'polygon',
      rpcUrl: `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID || 'e8f6c0e074f14302bee0125c92f39606'}`,
      chainId: 137,
      nativeCurrency: 'MATIC'
    }
  ];

  // Flash Arbitrage Contract ABI (simplified)
  private contractABI = [
    "function executeArbitrage(address tokenA, address tokenB, uint256 flashLoanAmount, string calldata buyDEX, string calldata sellDEX, uint256 minProfitAmount) external",
    "function getEstimatedProfit(address tokenA, address tokenB, uint256 amount, string calldata buyDEX, string calldata sellDEX) external view returns (uint256)",
    "function setDEXRouter(string calldata dexName, address router) external",
    "function emergencyWithdraw(address token, uint256 amount) external",
    "event ArbitrageExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 profit, string dexA, string dexB)",
    "event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, bool success)"
  ];

  constructor() {
    this.initializeProviders();
    this.initializeWallet();
    this.loadContractAddresses();
  }

  private initializeProviders(): void {
    for (const network of this.networks) {
      try {
        const provider = new ethers.JsonRpcProvider(network.rpcUrl);
        this.providers.set(network.name, provider);
        console.log(`✅ Connected to ${network.name} network`);
      } catch (error) {
        console.error(`❌ Failed to connect to ${network.name}:`, error);
      }
    }
  }

  private initializeWallet(): void {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.warn('⚠️ No private key provided - running in read-only mode');
      return;
    }

    try {
      this.wallet = new ethers.Wallet(privateKey);
      console.log(`✅ Wallet initialized: ${this.wallet.address}`);
    } catch (error) {
      console.error('❌ Failed to initialize wallet:', error);
    }
  }

  private loadContractAddresses(): void {
    try {
      for (const network of this.networks) {
        const deploymentPath = path.join(process.cwd(), `deployments/${network.name}.json`);
        if (fs.existsSync(deploymentPath)) {
          const deployment: ContractDeployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
          network.contractAddress = deployment.contractAddress;
          
          // Initialize contract instance
          const provider = this.providers.get(network.name);
          if (provider && this.wallet) {
            const connectedWallet = this.wallet.connect(provider);
            const contract = new ethers.Contract(
              deployment.contractAddress,
              this.contractABI,
              connectedWallet
            );
            this.contracts.set(network.name, contract);
            console.log(`✅ Contract loaded for ${network.name}: ${deployment.contractAddress}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to load contract addresses:', error);
    }
  }

  getProvider(network: string): ethers.JsonRpcProvider | undefined {
    return this.providers.get(network);
  }

  getContract(network: string): ethers.Contract | undefined {
    return this.contracts.get(network);
  }

  async getNetworkStatus(network: string): Promise<{
    isActive: boolean;
    blockNumber: string;
    gasPrice: string;
    contractDeployed: boolean;
  }> {
    const provider = this.providers.get(network);
    if (!provider) {
      return { isActive: false, blockNumber: "0", gasPrice: "0", contractDeployed: false };
    }

    try {
      const [blockNumber, feeData] = await Promise.all([
        provider.getBlockNumber(),
        provider.getFeeData()
      ]);

      const contractDeployed = this.contracts.has(network);

      return {
        isActive: true,
        blockNumber: blockNumber.toString(),
        gasPrice: feeData.gasPrice?.toString() || "0",
        contractDeployed
      };
    } catch (error) {
      console.error(`Error getting status for ${network}:`, error);
      return { isActive: false, blockNumber: "0", gasPrice: "0", contractDeployed: false };
    }
  }

  async estimateArbitrageProfit(
    network: string,
    tokenA: string,
    tokenB: string,
    amount: string,
    buyDEX: string,
    sellDEX: string
  ): Promise<string> {
    const contract = this.contracts.get(network);
    if (!contract) {
      throw new Error(`Contract not deployed on ${network}`);
    }

    try {
      const estimatedProfit = await contract.getEstimatedProfit(
        tokenA,
        tokenB,
        amount,
        buyDEX,
        sellDEX
      );
      return estimatedProfit.toString();
    } catch (error) {
      console.error(`Error estimating profit on ${network}:`, error);
      return "0";
    }
  }

  async executeArbitrageTransaction(
    network: string,
    tokenA: string,
    tokenB: string,
    flashLoanAmount: string,
    buyDEX: string,
    sellDEX: string,
    minProfitAmount: string = "0"
  ): Promise<string> {
    const contract = this.contracts.get(network);
    if (!contract) {
      throw new Error(`Contract not deployed on ${network}`);
    }

    if (!this.wallet) {
      throw new Error("Wallet not initialized - cannot execute transactions");
    }

    try {
      // Convert DEX names to contract-compatible format
      const buyDexName = this.mapDEXName(buyDEX);
      const sellDexName = this.mapDEXName(sellDEX);

      console.log(`🚀 Executing arbitrage on ${network}:`, {
        tokenA,
        tokenB,
        flashLoanAmount,
        buyDEX: buyDexName,
        sellDEX: sellDexName,
        minProfitAmount
      });

      // Estimate gas first
      const gasEstimate = await contract.executeArbitrage.estimateGas(
        tokenA,
        tokenB,
        flashLoanAmount,
        buyDexName,
        sellDexName,
        minProfitAmount
      );

      // Execute transaction with 20% gas buffer
      const tx = await contract.executeArbitrage(
        tokenA,
        tokenB,
        flashLoanAmount,
        buyDexName,
        sellDexName,
        minProfitAmount,
        {
          gasLimit: gasEstimate * 120n / 100n, // 20% buffer
        }
      );

      console.log(`📝 Transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

      return tx.hash;
    } catch (error) {
      console.error(`❌ Error executing arbitrage on ${network}:`, error);
      throw error;
    }
  }

  private mapDEXName(dexName: string): string {
    const dexMap: { [key: string]: string } = {
      '1inch': 'uniswap', // Map to actual router
      '0x Protocol': 'sushiswap',
      'Uniswap V3': 'uniswap',
      'Sushiswap': 'sushiswap',
      'Curve': 'curve',
      'Balancer': 'balancer'
    };
    
    return dexMap[dexName] || 'uniswap';
  }

  async getWalletBalance(network: string): Promise<string> {
    if (!this.wallet) return "0";
    
    const provider = this.providers.get(network);
    if (!provider) return "0";

    try {
      const balance = await provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error(`Error getting wallet balance for ${network}:`, error);
      return "0";
    }
  }

  async getTokenBalance(network: string, tokenAddress: string): Promise<string> {
    if (!this.wallet) return "0";
    
    const provider = this.providers.get(network);
    if (!provider) return "0";

    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"],
        provider
      );

      const [balance, decimals] = await Promise.all([
        tokenContract.balanceOf(this.wallet.address),
        tokenContract.decimals()
      ]);

      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error(`Error getting token balance for ${tokenAddress} on ${network}:`, error);
      return "0";
    }
  }

  getNetworks(): NetworkConfig[] {
    return this.networks;
  }

  isContractDeployed(network: string): boolean {
    return this.contracts.has(network);
  }

  getContractAddress(network: string): string | undefined {
    const networkConfig = this.networks.find(n => n.name === network);
    return networkConfig?.contractAddress;
  }

  getWalletAddress(): string | undefined {
    return this.wallet?.address;
  }
}

export const blockchainService = new BlockchainService();
