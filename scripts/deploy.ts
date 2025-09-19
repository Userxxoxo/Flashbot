
import { ethers } from "hardhat";
import { writeFileSync } from "fs";

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // Balancer Vault address on Ethereum Mainnet
    const BALANCER_VAULT = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
    
    // Deploy FlashArbitrage contract
    const FlashArbitrage = await ethers.getContractFactory("FlashArbitrage");
    const flashArbitrage = await FlashArbitrage.deploy(
        BALANCER_VAULT,
        deployer.address // Fee recipient
    );

    await flashArbitrage.deployed();

    console.log("FlashArbitrage deployed to:", flashArbitrage.address);

    // Save deployment info
    const deploymentInfo = {
        network: "mainnet",
        contractAddress: flashArbitrage.address,
        deployerAddress: deployer.address,
        balancerVault: BALANCER_VAULT,
        deploymentTime: new Date().toISOString(),
        transactionHash: flashArbitrage.deployTransaction.hash
    };

    writeFileSync(
        "deployments/mainnet.json",
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("Deployment info saved to deployments/mainnet.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
