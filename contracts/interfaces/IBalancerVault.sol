
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IFlashLoanReceiver.sol";

interface IBalancerVault {
    function flashLoan(
        IFlashLoanReceiver recipient,
        address[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external;
}
