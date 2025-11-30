// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IOracle {
    function getPrice() external view returns (uint256);
}

contract VictimContract {
    IOracle public oracle;
    mapping(address => uint256) public balances;

    // --- REENTRANCY GUARD STATE ---
    bool private isLocked; // State variable for the lock

    event TokensPurchased(address buyer, uint256 amountSpent, uint256 tokensReceived);

    // --- REENTRANCY GUARD MODIFIER ---
    modifier nonReentrant() {
        // If locked is true, revert with error
        require(!isLocked, "Reentrancy Guard: Call in progress.");
        isLocked = true;
        _; // Execute the function content
        isLocked = false;
    }

    constructor(address _oracle) {
        oracle = IOracle(_oracle);
    }

    // VULNERABILITY 1: Oracle reliance remains, but internal functions are protected
    function buyTokens() public payable nonReentrant {
        require(msg.value > 0, "Send ETH to buy tokens");
        uint256 price = oracle.getPrice();
        uint256 tokens = msg.value * price;
        balances[msg.sender] += tokens;
        emit TokensPurchased(msg.sender, msg.value, tokens);
    }

    // --- DRAINING FUNCTION (Protected) ---
    // Allows users to sell tokens back for ETH
    function sellTokens(uint256 tokenAmount) public nonReentrant {
        require(balances[msg.sender] >= tokenAmount, "Not enough tokens");

        uint256 currentPrice = oracle.getPrice();
        uint256 ethToReturn = tokenAmount / currentPrice;

        // FIX: If the contract is insolvent, just drain what's left.
        if (address(this).balance < ethToReturn) {
            ethToReturn = address(this).balance;
        }

        // State change before external call (Protected by nonReentrant)
        balances[msg.sender] -= tokenAmount;

        // External call (Transfer ETH)
        payable(msg.sender).transfer(ethToReturn);
    }
}