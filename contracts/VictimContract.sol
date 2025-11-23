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

    // VULNERABILITY 1: Trusts the oracle blindly
    function buyTokens() public payable {
        require(msg.value > 0, "Send ETH to buy tokens");
        uint256 price = oracle.getPrice();
        uint256 tokens = msg.value * price;
        balances[msg.sender] += tokens;
        emit TokensPurchased(msg.sender, msg.value, tokens);
    }

    // --- NEW FUNCTION FOR DRAINING ---
    // Allows users to sell tokens back for ETH
    function sellTokens(uint256 tokenAmount) public {
        require(balances[msg.sender] >= tokenAmount, "Not enough tokens");

        uint256 currentPrice = oracle.getPrice();
        // Calculate how much ETH to return (Tokens / Price)
        uint256 ethToReturn = tokenAmount / currentPrice;

        require(address(this).balance >= ethToReturn, "Contract has no ETH to give you!");

        balances[msg.sender] -= tokenAmount;
        payable(msg.sender).transfer(ethToReturn);
    }
}