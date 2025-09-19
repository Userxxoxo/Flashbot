
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFlashLoanReceiver.sol";
import "./interfaces/IDEXRouter.sol";
import "./interfaces/IUniswapV2Router.sol";
import "./interfaces/IBalancerVault.sol";

contract FlashArbitrage is IFlashLoanReceiver, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Balancer Vault for flash loans
    IBalancerVault public immutable balancerVault;
    
    // DEX router addresses
    mapping(string => address) public dexRouters;
    
    // Fee recipient
    address public feeRecipient;
    uint256 public feePercentage = 500; // 5% in basis points
    
    // Events
    event ArbitrageExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 profit,
        string dexA,
        string dexB
    );
    
    event FlashLoanExecuted(
        address indexed asset,
        uint256 amount,
        uint256 premium,
        bool success
    );

    constructor(
        address _balancerVault,
        address _feeRecipient
    ) {
        balancerVault = IBalancerVault(_balancerVault);
        feeRecipient = _feeRecipient;
        
        // Initialize common DEX routers
        dexRouters["uniswap"] = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
        dexRouters["sushiswap"] = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    }

    function setDEXRouter(string calldata dexName, address router) external onlyOwner {
        dexRouters[dexName] = router;
    }

    function setFeeParameters(address _feeRecipient, uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 2000, "Fee too high"); // Max 20%
        feeRecipient = _feeRecipient;
        feePercentage = _feePercentage;
    }

    function executeArbitrage(
        address tokenA,
        address tokenB,
        uint256 flashLoanAmount,
        string calldata buyDEX,
        string calldata sellDEX,
        uint256 minProfitAmount
    ) external onlyOwner nonReentrant {
        require(dexRouters[buyDEX] != address(0), "Invalid buy DEX");
        require(dexRouters[sellDEX] != address(0), "Invalid sell DEX");
        
        // Prepare flash loan
        address[] memory assets = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        assets[0] = tokenA;
        amounts[0] = flashLoanAmount;
        
        // Encode arbitrage parameters
        bytes memory userData = abi.encode(
            tokenA,
            tokenB,
            flashLoanAmount,
            buyDEX,
            sellDEX,
            minProfitAmount
        );
        
        // Execute flash loan
        balancerVault.flashLoan(
            IFlashLoanReceiver(address(this)),
            assets,
            amounts,
            userData
        );
    }

    function receiveFlashLoan(
        address[] memory assets,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external override {
        require(msg.sender == address(balancerVault), "Invalid caller");
        
        // Decode parameters
        (
            address tokenA,
            address tokenB,
            uint256 flashLoanAmount,
            string memory buyDEX,
            string memory sellDEX,
            uint256 minProfitAmount
        ) = abi.decode(userData, (address, address, uint256, string, string, uint256));
        
        // Execute arbitrage logic
        uint256 profit = _executeArbitrageLogic(
            tokenA,
            tokenB,
            flashLoanAmount,
            buyDEX,
            sellDEX
        );
        
        require(profit >= minProfitAmount, "Insufficient profit");
        
        // Calculate and transfer fees
        uint256 totalRepayment = amounts[0] + feeAmounts[0];
        uint256 netProfit = profit - totalRepayment;
        uint256 fee = (netProfit * feePercentage) / 10000;
        
        // Repay flash loan
        IERC20(tokenA).safeTransfer(address(balancerVault), totalRepayment);
        
        // Transfer fee and remaining profit
        if (fee > 0) {
            IERC20(tokenA).safeTransfer(feeRecipient, fee);
        }
        
        emit FlashLoanExecuted(tokenA, amounts[0], feeAmounts[0], true);
        emit ArbitrageExecuted(tokenA, tokenB, flashLoanAmount, netProfit, buyDEX, sellDEX);
    }

    function _executeArbitrageLogic(
        address tokenA,
        address tokenB,
        uint256 amount,
        string memory buyDEX,
        string memory sellDEX
    ) internal returns (uint256 finalAmount) {
        // Step 1: Swap tokenA for tokenB on buyDEX
        uint256 tokenBAmount = _swapTokens(
            tokenA,
            tokenB,
            amount,
            dexRouters[buyDEX]
        );
        
        // Step 2: Swap tokenB back to tokenA on sellDEX
        finalAmount = _swapTokens(
            tokenB,
            tokenA,
            tokenBAmount,
            dexRouters[sellDEX]
        );
        
        require(finalAmount > amount, "No arbitrage profit");
        return finalAmount;
    }

    function _swapTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address router
    ) internal returns (uint256 amountOut) {
        IERC20(tokenIn).safeApprove(router, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint256[] memory amounts = IUniswapV2Router(router).swapExactTokensForTokens(
            amountIn,
            0, // Accept any amount of tokenOut
            path,
            address(this),
            block.timestamp + 300 // 5 minute deadline
        );
        
        return amounts[1];
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    function getEstimatedProfit(
        address tokenA,
        address tokenB,
        uint256 amount,
        string calldata buyDEX,
        string calldata sellDEX
    ) external view returns (uint256 estimatedProfit) {
        // Get estimated amounts from both DEXs
        uint256 tokenBAmount = _getAmountOut(tokenA, tokenB, amount, dexRouters[buyDEX]);
        uint256 finalAmount = _getAmountOut(tokenB, tokenA, tokenBAmount, dexRouters[sellDEX]);
        
        if (finalAmount > amount) {
            return finalAmount - amount;
        }
        return 0;
    }

    function _getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address router
    ) internal view returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint256[] memory amounts = IUniswapV2Router(router).getAmountsOut(amountIn, path);
        return amounts[1];
    }
}
