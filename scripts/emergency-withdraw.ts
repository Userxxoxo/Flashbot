
import { ethers } from "hardhat";
import fs from "fs";

async function main() {
    const [deployer] = await ethers.getSigners();
    const network = process.env.HARDHAT_NETWORK || "mainnet";
    
    console.log("Emergency withdrawal initiated by:", deployer.address);
    
    // Load contract address
    const deploymentPath = `deployments/${network}.json`;
    if (!fs.existsSync(deploymentPath)) {
        throw new Error(`No deployment found for ${network}`);
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    // Get contract instance
    const FlashArbitrage = await ethers.getContractFactory("FlashArbitrage");
    const contract = FlashArbitrage.attach(deployment.contractAddress);
    
    // Common token addresses (you can add more)
    const tokens = {
        mainnet: {
            WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            USDC: "0xA0b86a33E6417faCf2bDc6e5Bd3dd1c83c4E8d5a",
            USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        },
        polygon: {
            WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
            USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
        },
        base: {
            WETH: "0x4200000000000000000000000000000000000006",
            USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        }
    };
    
    const networkTokens = tokens[network as keyof typeof tokens];
    if (!networkTokens) {
        console.log("No predefined tokens for this network");
        return;
    }
    
    console.log(`Checking balances for ${Object.keys(networkTokens).length} tokens...`);
    
    for (const [symbol, address] of Object.entries(networkTokens)) {
        try {
            // Check token balance
            const tokenContract = new ethers.Contract(
                address,
                ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"],
                deployer
            );
            
            const balance = await tokenContract.balanceOf(deployment.contractAddress);
            
            if (balance > 0) {
                const decimals = await tokenContract.decimals();
                const formattedBalance = ethers.formatUnits(balance, decimals);
                
                console.log(`Found ${formattedBalance} ${symbol} - withdrawing...`);
                
                const tx = await contract.emergencyWithdraw(address, balance);
                await tx.wait();
                
                console.log(`✅ Withdrawn ${formattedBalance} ${symbol} - TX: ${tx.hash}`);
            }
        } catch (error) {
            console.error(`❌ Error withdrawing ${symbol}:`, error);
        }
    }
    
    // Check ETH balance
    const ethBalance = await ethers.provider.getBalance(deployment.contractAddress);
    if (ethBalance > 0) {
        const formattedBalance = ethers.formatEther(ethBalance);
        console.log(`Found ${formattedBalance} ETH - manual withdrawal required`);
        console.log("Add a payable withdraw function to withdraw ETH");
    }
    
    console.log("Emergency withdrawal completed");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
