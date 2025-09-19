
# Real Arbitrage Bot Deployment Guide

## Prerequisites

1. **Wallet Setup**: You need a wallet with ETH for gas fees and contract deployment
2. **API Keys**: Get API keys from 1inch, 0x Protocol, Infura, and Alchemy
3. **Database**: Set up a PostgreSQL database (Neon recommended)

## Environment Setup

1. Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

2. **Critical Security Warning**: 
   - Your `PRIVATE_KEY` controls real funds
   - Never commit `.env` to version control
   - Use a dedicated trading wallet with limited funds

## Smart Contract Deployment

### Step 1: Compile Contracts
```bash
npx hardhat compile
```

### Step 2: Deploy to Mainnet
```bash
npx hardhat run scripts/deploy.ts --network mainnet
```

### Step 3: Verify Contract (Optional)
```bash
npx hardhat verify --network mainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Network Configuration

The bot supports these networks:
- **Ethereum Mainnet**: Primary trading network
- **Polygon**: Lower gas fees
- **Base**: Layer 2 solution

Each network requires:
1. Smart contract deployment
2. DEX router configuration
3. Sufficient native token for gas

## Trading Parameters

### Minimum Requirements
- **Gas Balance**: At least 0.1 ETH per network
- **Profit Threshold**: Recommended 1.5% minimum
- **Flash Loan Amount**: Network-dependent limits

### Risk Management
- Start with small amounts (< $1000)
- Monitor gas prices and network congestion
- Set conservative profit thresholds
- Enable manual execution initially

## Production Checklist

- [ ] Contract deployed and verified
- [ ] Environment variables configured
- [ ] Database connected and migrated
- [ ] API keys validated
- [ ] Wallet funded with gas
- [ ] Profit thresholds set
- [ ] Monitoring configured
- [ ] Emergency stop procedures tested

## Monitoring and Maintenance

1. **Transaction Monitoring**: Watch for failed transactions
2. **Profit Tracking**: Monitor actual vs expected profits
3. **Gas Optimization**: Adjust gas strategies based on network conditions
4. **API Rate Limits**: Monitor API usage and quotas

## Emergency Procedures

### Stop Trading
```javascript
// In the dashboard, disable auto-execution
// Or call the emergency stop function
```

### Withdraw Funds
```bash
npx hardhat run scripts/emergency-withdraw.ts --network mainnet
```

### Contract Upgrade
Deploy new contract and update addresses in deployment files.

## Legal and Compliance

- Ensure compliance with local regulations
- Consider tax implications of automated trading
- Maintain proper records of all transactions
- Understand the risks of automated trading

**WARNING**: This is experimental software. Trade at your own risk.
