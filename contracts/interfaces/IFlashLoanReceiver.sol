
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IFlashLoanReceiver {
    function receiveFlashLoan(
        address[] memory assets,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external;
}
