// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IOracle {
    function getPrice() external view returns (uint256);
}

contract VictimContract {
    IOracle public oracle;
    mapping(address => uint256) public balances;

    event TokensPurchased(address buyer, uint256 amountSpent, uint256 tokensReceived);

    constructor(address _oracle) {
        oracle = IOracle(_oracle);
    }

    // VULNERABILITY:
    // It trusts the oracle's price without verifying the source.
    function buyTokens() public payable {
        require(msg.value > 0, "Send ETH to buy tokens");

        uint256 price = oracle.getPrice(); // VULNERABLE

        // Simple calculation: tokens = ETH * price
        uint256 tokens = msg.value * price;

        balances[msg.sender] += tokens;

        emit TokensPurchased(msg.sender, msg.value, tokens);
    }
}
