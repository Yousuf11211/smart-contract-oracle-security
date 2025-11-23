// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SecuredOracle {
    uint256 private price;
    address public owner;

    event PriceUpdated(uint256 newPrice);

    constructor(uint256 initialPrice) {
        price = initialPrice;
        owner = msg.sender; // The person who deploys this is the Owner
    }

    // MODIFIER: The "Bouncer" at the door
    modifier onlyOwner() {
        require(msg.sender == owner, "Security Alert: You are not the owner!");
        _;
    }

    // SECURITY FIX: Added 'onlyOwner' lock
    function setPrice(uint256 _price) public onlyOwner {
        price = _price;
        emit PriceUpdated(_price);
    }

    function getPrice() public view returns (uint256) {
        return price;
    }
}