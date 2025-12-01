// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IOracle {
    function getPrice() external view returns (uint256);
}

contract VictimContract {
    IOracle public oracle;

    uint256 public collateralFactor = 75;
    mapping(address => uint256) public collateralBalance;

    // FIX 1: Track debt so users can't borrow infinite times
    mapping(address => uint256) public borrowedBalance;

    address public owner;

    constructor(address _oracle) payable {
        oracle = IOracle(_oracle);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner/defender can set parameters");
        _;
    }

    function setCollateralFactor(uint256 _factor) public onlyOwner {
        collateralFactor = _factor;
    }

    function depositCollateral() public {
        collateralBalance[msg.sender] += 10;
    }

    function borrowETH(uint256 amountToBorrow) public {
        uint256 goldPrice = oracle.getPrice();
        uint256 userCollateral = collateralBalance[msg.sender];

        // Calculate max allowed borrow
        uint256 maxBorrow = (userCollateral * goldPrice * collateralFactor) / 100;

        // FIX 2: Check limit against (Current Debt + New Loan)
        uint256 currentDebt = borrowedBalance[msg.sender];
        require(currentDebt + amountToBorrow <= maxBorrow, "Shortfall: Not enough collateral value!");

        require(address(this).balance >= amountToBorrow, "Bank is empty!");

        // FIX 3: Update debt BEFORE sending money (Checks-Effects-Interactions)
        borrowedBalance[msg.sender] += amountToBorrow;

        // FIX 4: Use .call to support Smart Wallets
        (bool success, ) = payable(msg.sender).call{value: amountToBorrow}("");
        require(success, "Transfer failed");
    }

    receive() external payable {}
}