// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IOracle {
    function getPrice() external view returns (uint256);
}

contract VictimContract {
    IOracle public oracle;

    uint256 public collateralFactor = 75;
    mapping(address => uint256) public collateralBalance;
    address public owner; // ADDED: Owner variable

    constructor(address _oracle) payable {
        oracle = IOracle(_oracle);
        owner = msg.sender; // Set deployer as owner (Defender)
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner/defender can set parameters");
        _;
    }

    // NOW PROTECTED: Only the Defender can set this.
    function setCollateralFactor(uint256 _factor) public onlyOwner {
        collateralFactor = _factor;
    }

    function depositCollateral() public {
        collateralBalance[msg.sender] += 10;
    }

    function borrowETH(uint256 amountToBorrow) public {
        uint256 goldPrice = oracle.getPrice();
        uint256 userCollateral = collateralBalance[msg.sender];

        uint256 maxBorrow = (userCollateral * goldPrice * collateralFactor) / 100;

        require(amountToBorrow <= maxBorrow, "Shortfall: Not enough collateral value!");
        require(address(this).balance >= amountToBorrow, "Bank is empty!");

        payable(msg.sender).transfer(amountToBorrow);
    }

    receive() external payable {}
}