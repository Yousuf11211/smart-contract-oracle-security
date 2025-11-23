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

    // VULNERABILITY: Trusts the oracle blindly
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

        // FIX: If the contract doesn't have enough ETH, just drain what's left.
        // This prevents the "Contract has no ETH" revert error.
        if (address(this).balance < ethToReturn) {
            ethToReturn = address(this).balance;
        }

        balances[msg.sender] -= tokenAmount;

        // Transfer the calculated amount (or the max available)
        payable(msg.sender).transfer(ethToReturn);
    }
}