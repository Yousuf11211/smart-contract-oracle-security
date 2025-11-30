// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IOracle {
    function getPrice() external view returns (uint256);
}

contract VictimContract {
    IOracle public oracle;

    // DEFENDER MODE: This is the "Safety Dial" (75%)
    uint256 public collateralFactor = 75;

    mapping(address => uint256) public collateralBalance;

    constructor(address _oracle) payable {
        oracle = IOracle(_oracle);
    }

    function depositCollateral() public {
        collateralBalance[msg.sender] += 10; // Give user 10 Gold units
    }

    function borrowETH(uint256 amountToBorrow) public {
        uint256 goldPrice = oracle.getPrice();
        uint256 userCollateral = collateralBalance[msg.sender];

        // LOGIC: (Collateral * Price * Factor) / 100
        uint256 maxBorrow = (userCollateral * goldPrice * collateralFactor) / 100;

        require(amountToBorrow <= maxBorrow, "Shortfall: Not enough collateral value!");
        require(address(this).balance >= amountToBorrow, "Bank is empty!");

        payable(msg.sender).transfer(amountToBorrow);
    }

    // Helper to change the safety dial (Defender Mode)
    function setCollateralFactor(uint256 _factor) public {
        collateralFactor = _factor;
    }

    receive() external payable {}
}