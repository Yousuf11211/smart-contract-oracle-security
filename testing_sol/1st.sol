pragma solidity ^0.8.0;

contract VulnerableBank {
    mapping(address => uint) public balances;
    uint public price;

    // Vulnerability 1: Oracle Manipulation (No owner check)
    function setPrice(uint _price) public {
        price = _price;
    }

    // Vulnerability 2: Reentrancy + Unchecked Call
    function withdraw() public {
        uint bal = balances[msg.sender];
        // Low level call, return value ignored, no nonReentrant
        msg.sender.call{value: bal}(""); 
        balances[msg.sender] = 0;
    }

    // Vulnerability 3: Weak Randomness
    function lottery() public {
        // Miner can manipulate timestamp
        if (block.timestamp % 2 == 0) {
            payable(msg.sender).transfer(address(this).balance);
        }
    }
}