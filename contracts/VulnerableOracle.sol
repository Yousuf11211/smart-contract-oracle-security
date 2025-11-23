// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VulnerableOracle {
    uint256 public price;

    event PriceUpdated(uint256 newPrice);

    constructor(uint256 initialPrice) {
        price = initialPrice;
    }

    //  VULNERABILITY:
    // Anyone can call this and set the price to anything.
    function setPrice(uint256 _price) public {
        price = _price;
        emit PriceUpdated(_price);
    }

    function getPrice() public view returns (uint256) {
        return price;
    }
}
