# 🛡️ Oracle Manipulation Security Lab

> **Advanced Smart Contract Security Simulation Environment**
> An interactive educational platform demonstrating Oracle Manipulation attacks and defense mechanisms in DeFi protocols.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.28-green.svg)
![Hardhat](https://img.shields.io/badge/Hardhat-2.27.1-yellow.svg)
![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Smart Contracts](#-smart-contracts)
- [Installation](#-installation)
- [Usage](#-usage)
- [Attack Scenarios](#-attack-scenarios)
- [Security Analysis](#-security-analysis)
- [Web Interface](#-web-interface)
- [Technology Stack](#-technology-stack)
- [Educational Value](#-educational-value)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

The **Oracle Manipulation Security Lab** is a comprehensive educational platform designed to help developers, security researchers, and blockchain enthusiasts understand one of the most critical vulnerabilities in DeFi: **Oracle Price Manipulation**.

This project provides:
- **Live simulation** of oracle manipulation attacks
- **Side-by-side comparison** of vulnerable vs. secure implementations
- **Interactive web interface** for real-time testing
- **Automated vulnerability scanner** with AI-powered fix suggestions
- **Educational resources** for understanding smart contract security

### What is Oracle Manipulation?

Oracle manipulation occurs when an attacker can control or influence the price feed that a smart contract relies on for critical decisions (e.g., collateral valuation, liquidations). This can lead to:
- Unauthorized borrowing beyond collateral value
- Draining liquidity pools
- Protocol insolvency
- Loss of user funds

---

## ✨ Features

### Attack Simulation
- **Flash Loan Attack**: Execute atomic transactions that manipulate price oracles
- **Manual Step-by-Step Mode**: Learn the attack flow by executing each step individually
- **Real-time Feedback**: Monitor contract state changes and fund movements

### Defense Mechanisms
- **Access Control**: Demonstrates proper `onlyOwner` pattern implementation
- **Secure Oracle**: Shows best practices for oracle design
- **Safety Parameters**: Configurable loan-to-value ratios

### Vulnerability Scanner
- **Static Code Analysis**: Automated detection of common vulnerabilities
- **Pattern Recognition**: Identifies risky code patterns including:
  - Unprotected oracle updates
  - Reentrancy vulnerabilities
  - Integer overflow risks (pre-0.8.0)
  - Phishing via `tx.origin`
  - Weak randomness
  - Dangerous `delegatecall` usage
- **Auto-Fix Engine**: Automatically applies security patches to vulnerable code
- **Risk Scoring**: Quantifies contract security level (0-10 scale)

### Modern Web Interface
- **Dual-Mode Toggle**: Switch between vulnerable and secure environments
- **Real-time Wallet Integration**: Connect via MetaMask
- **Interactive Dashboard**: Monitor oracle prices, bank liquidity, collateral balances
- **Responsive Design**: Works on desktop and mobile devices

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Web Interface                         │
│  (index.html, scanner.html, app.js, scanner.js)         │
└──────────────────┬──────────────────────────────────────┘
                   │ ethers.js
                   ↓
┌─────────────────────────────────────────────────────────┐
│              Hardhat Local Network                       │
│                 (localhost:8545)                         │
└──────────────────┬──────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ↓                   ↓
┌──────────────────┐  ┌──────────────────┐
│ Vulnerable Mode  │  │   Secure Mode    │
├──────────────────┤  ├──────────────────┤
│ VulnerableOracle │  │  SecureOracle    │
│ VictimContract   │  │ VictimContract   │
│ AttackerContract │  │ AttackerContract │
└──────────────────┘  └──────────────────┘
```

---

## 📜 Smart Contracts

### 1. **VulnerableOracle.sol**
```solidity
// ❌ VULNERABLE: Anyone can set the price
function setPrice(uint256 _price) public {
    price = _price;
}
```
**Vulnerability**: No access control, allowing attackers to manipulate prices.

### 2. **SecureOracle.sol**
```solidity
// ✅ SECURE: Only owner can set the price
modifier onlyOwner() {
    require(msg.sender == owner, "Not the owner!");
    _;
}

function setPrice(uint256 _price) public onlyOwner {
    price = _price;
}
```
**Protection**: Access control ensures only trusted entities can update prices.

### 3. **VictimContract.sol** (The Bank)
Acts as a lending protocol that:
- Accepts collateral deposits (Gold tokens)
- Values collateral using oracle prices
- Allows borrowing ETH based on collateral value
- Implements configurable loan-to-value ratios

**Key Function:**
```solidity
function borrowETH(uint256 amountToBorrow) public {
    uint256 goldPrice = oracle.getPrice();
    uint256 userCollateral = collateralBalance[msg.sender];
    uint256 maxBorrow = (userCollateral * goldPrice * collateralFactor) / 100;
    
    require(amountToBorrow <= maxBorrow, "Not enough collateral!");
    payable(msg.sender).transfer(amountToBorrow);
}
```

### 4. **Attacker.sol** (Flash Loan Attack)
Executes an atomic attack:
```solidity
function flashAttack() public {
    victim.depositCollateral();           // 1. Get 10 Gold
    oracle.setPrice(1000000 ether);       // 2. Pump price to 1M ETH
    victim.borrowETH(bankBalance);        // 3. Drain the bank
    payable(msg.sender).transfer(...);    // 4. Profit!
    oracle.setPrice(1 ether);             // 5. Reset (cover tracks)
}
```

---

## 🚀 Installation

### Prerequisites
- Node.js (v16.0.0 or higher)
- npm or yarn
- MetaMask browser extension
- Git

### Setup Instructions

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/smart-contract-oracle-security.git
cd smart-contract-oracle-security
```

2. **Install dependencies**
```bash
npm install
```

3. **Compile contracts**
```bash
npx hardhat compile
```

4. **Deploy contracts to local network**

In one terminal, start Hardhat node:
```bash
npx hardhat node
```

In another terminal, deploy contracts:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

5. **Configure MetaMask**
- Network: `http://localhost:8545`
- Chain ID: `31337`
- Import one of the test accounts from Hardhat node output

6. **Update contract addresses**
Copy deployed addresses from terminal and update in `app.js`:
```javascript
const VULNERABLE_ORACLE_ADDRESS = "0x...";
const SECURE_ORACLE_ADDRESS = "0x...";
const VICTIM_CONTRACT_ADDRESS = "0x...";
const ATTACKER_VULN_ADDRESS = "0x...";
const ATTACKER_SECURE_ADDRESS = "0x...";
```

7. **Launch the application**
Open `index.html` in a browser or use a local server:
```bash
npx http-server
```

---

## 🔧 Essential Commands

This section provides detailed information about the core commands needed to run this project.

### 1. Start Hardhat Local Blockchain

```bash
npx hardhat node
```

**What it does:**
- Starts a local Ethereum blockchain node on your machine
- Listens on `http://localhost:8545` (default port)
- Provides 20 test accounts, each pre-funded with 10,000 ETH
- Displays account addresses and private keys for testing
- Shows real-time transaction logs as they occur
- Persists until you stop it (Ctrl+C)

**Output Example:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
...
```

**When to use:**
- Before deploying contracts
- Keep running throughout development/testing
- **Must be running** before using the web interface

**Tips:**
- Run in a **separate terminal** so you can see transaction logs
- Each time you restart, the blockchain state resets
- Transactions are instant (no waiting for block confirmations)
- Use Account #0 as the contract deployer/owner

---

### 2. Deploy Smart Contracts

```bash
npx hardhat run scripts/deploy.js --network localhost
```

**What it does:**
- Compiles all Solidity contracts (if not already compiled)
- Connects to the local Hardhat node at `localhost:8545`
- Deploys contracts in this order:
  1. **VulnerableOracle** (unprotected price oracle)
  2. **SecureOracle** (access-controlled oracle)
  3. **VictimContract** (the lending protocol/bank)
  4. **Attacker (Vulnerable)** (targets VulnerableOracle)
  5. **Attacker (Secure)** (targets SecureOracle - will fail)
- Funds the VictimContract with 50 ETH
- Prints all deployed contract addresses

**Output Example:**
```
Deploying contracts with account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
VulnerableOracle deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
SecureOracle deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VictimContract deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
Victim funded with 50 ETH
AttackerVuln deployed to: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
AttackerSecure deployed to: 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
```

**When to use:**
- After starting `npx hardhat node`
- After making changes to smart contracts
- When addresses in `app.js` don't match your local blockchain

**Important:**
**You MUST copy these addresses** to `app.js` after deployment:
```javascript
// In app.js (lines 2-6):
const VULNERABLE_ORACLE_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const SECURE_ORACLE_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const VICTIM_CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const ATTACKER_VULN_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
const ATTACKER_SECURE_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
```

**Tips:**
- Addresses change each time you restart Hardhat node
- Run this command in a **different terminal** from `npx hardhat node`
- If deployment fails, check that Hardhat node is running
- The deployer account becomes the "owner" of SecureOracle

---

### 3. Start Web Server

```bash
npx http-server
```

**What it does:**
- Starts a lightweight HTTP server to serve static files
- Default URL: `http://localhost:8080` (or next available port)
- Serves `index.html`, `scanner.html`, and all assets
- Enables proper CORS handling for MetaMask integration
- Watches for file changes (some versions)

**Output Example:**
```
Starting up http-server, serving ./

http-server version: 14.1.1

Available on:
  http://127.0.0.1:8080
  http://192.168.1.100:8080

Hit CTRL-C to stop the server
```

**When to use:**
- After deploying contracts
- When you want to test the web interface
- Instead of opening HTML files directly (avoids CORS issues)

**Alternative Options:**

If `http-server` is not installed globally:
```bash
# Option 1: Install globally
npm install -g http-server

# Option 2: Use npx (recommended - no installation needed)
npx http-server

# Option 3: Use Python's built-in server
python -m http.server 8080

# Option 4: Use VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

**Tips:**
- Open the provided URL in your browser
- Make sure MetaMask is installed and unlocked
- If port 8080 is busy, it will use 8081, 8082, etc.
- Press `Ctrl+C` to stop the server

---

### Quick Start Command Reference

#### Complete Workflow (3 Terminals)

**Terminal 1 - Blockchain Node:**
```bash
cd smart-contract-oracle-security
npx hardhat node
# Keep running, shows transaction logs
```

**Terminal 2 - Deploy Contracts:**
```bash
cd smart-contract-oracle-security
npx hardhat run scripts/deploy.js --network localhost
# Copy addresses to app.js
```

**Terminal 3 - Web Server:**
```bash
cd smart-contract-oracle-security
npx http-server
# Open http://localhost:8080 in browser
```

#### One-Time Setup Commands

```bash
# First time only
npm install                    # Install dependencies
npx hardhat compile           # Compile contracts

# Configure MetaMask
# Network: http://localhost:8545
# Chain ID: 31337
# Import test account from Hardhat output
```

#### Development Commands

```bash
# Test contracts
npx hardhat test

# Check contract size
npx hardhat size-contracts

# Clean artifacts
npx hardhat clean

# Get help
npx hardhat help

# View available tasks
npx hardhat
```

---

### Troubleshooting Commands

#### Reset Everything
```bash
# Kill all node processes
# Windows:
taskkill /F /IM node.exe

# Linux/Mac:
pkill -f node

# Clean and restart
npx hardhat clean
npx hardhat compile
npx hardhat node
```

#### Contract Address Mismatch
```bash
# 1. Stop web server (Ctrl+C)
# 2. Redeploy contracts
npx hardhat run scripts/deploy.js --network localhost
# 3. Update addresses in app.js
# 4. Restart web server
npx http-server
# 5. Hard refresh browser (Ctrl+Shift+R)
```

#### MetaMask Issues
```bash
# Reset MetaMask nonce:
# Settings → Advanced → Reset Account

# Or restart Hardhat node (resets chain state)
# Ctrl+C to stop, then:
npx hardhat node
```

---

## 💻 Usage

### Basic Workflow

#### **Step 1: Connect Wallet**
Click "Connect Wallet" and approve MetaMask connection.

#### **Step 2: Fund the Bank**
Add ETH to the victim contract's liquidity pool (e.g., 10 ETH).

#### **Step 3: Choose Attack Mode**

**Option A: Atomic Flash Attack**
1. Click "EXECUTE FLASH ATTACK"
2. Observe the bank being drained in a single transaction
3. Check your wallet for stolen funds

**Option B: Manual Step-by-Step**
1. Click "Deposit 10 Gold" (get collateral)
2. Click "Pump Price" (manipulate oracle to 1000 ETH)
3. Click "Drain Bank" (borrow maximum ETH)
4. Observe the math: `10 Gold × 1000 ETH × 75% = 7,500 ETH borrowing power`

#### **Step 4: Test Security**
1. Toggle to "Safe Mode" using the switch
2. Try the same attack
3. Observe that price manipulation is blocked
4. See the error: "Only Owner can set price!"

### Vulnerability Scanner Usage

1. Navigate to "Vuln Scanner" page
2. Upload a `.sol` file or paste Solidity code
3. Click "Analyze Code"
4. Review detected vulnerabilities
5. Click "Auto-Fix Issues" to apply security patches
6. Copy the fixed code

---

## ⚔️ Attack Scenarios

### Scenario 1: Basic Oracle Manipulation
```
Initial State:
- Gold Price: 1 ETH
- Bank Liquidity: 10 ETH
- Attacker Collateral: 10 Gold

Attack:
1. Manipulate oracle: Set Gold = 1000 ETH
2. Borrow: 10 × 1000 × 0.75 = 7,500 ETH worth (but bank only has 10)
3. Result: Drain all 10 ETH with 10 Gold collateral

Expected Math:
- Fair borrow: 10 Gold × 1 ETH × 75% = 7.5 ETH
- Exploited borrow: 10 Gold × 1000 ETH × 75% = 7500 ETH
```

### Scenario 2: Collateral Factor Defense
```
Defender Action:
- Reduce collateralFactor from 75% to 50%

Impact:
- Reduces attacker's borrowing power
- Attack still succeeds but with lower leverage
- Recommendation: Combine with secure oracle
```

### Scenario 3: Secure Oracle Protection
```
Protection:
- SecureOracle has onlyOwner modifier
- Attacker cannot manipulate price

Attack Result:
- Transaction reverts: "Not the owner!"
- Bank funds remain safe
- Lesson: Access control is critical
```

---

## 🔒 Security Analysis

### Vulnerability Breakdown

| Vulnerability | Severity | Affected Contract | Mitigation |
|--------------|----------|-------------------|------------|
| Unprotected Price Oracle | CRITICAL | VulnerableOracle | Implement `onlyOwner` modifier |
| Centralization Risk | MEDIUM | SecureOracle | Use decentralized oracles (Chainlink) |
| Flash Loan Attack Vector | CRITICAL | VictimContract | Use TWAP, commit-reveal schemes |
| No Price Deviation Checks | HIGH | VictimContract | Implement price change limits |

### Best Practices Demonstrated

- **Access Control**: Use OpenZeppelin's `Ownable` or custom modifiers  
- **Decentralized Oracles**: Integrate Chainlink Price Feeds  
- **Time-Weighted Average Price (TWAP)**: Average prices over time  
- **Price Deviation Limits**: Reject unrealistic price changes  
- **Circuit Breakers**: Pause contracts during suspicious activity  
- **Multi-Signature**: Require multiple approvals for critical functions  

---

## 🌐 Web Interface

### Main Dashboard (`index.html`)
- **Oracle Section**: View and manipulate price feeds
- **Bank Vault**: Monitor and fund liquidity pools
- **Defender Dashboard**: Configure safety parameters
- **Manual Exploit Lab**: Step-by-step attack execution
- **Atomic Attack Console**: One-click flash loan attack
- **Mode Toggle**: Switch between vulnerable/secure environments

### Vulnerability Scanner (`scanner.html`)
- **File Upload**: Drag-and-drop `.sol` files
- **Code Editor**: Paste and analyze code directly
- **Real-time Analysis**: Pattern matching and risk scoring
- **Auto-Fix Engine**: Apply security patches automatically
- **Export Fixed Code**: Download secured contracts

### UI Components
- **Toast Notifications**: Real-time feedback
- **Balance Displays**: Live ETH/collateral tracking
- **Transaction Status**: Success/failure indicators
- **Gradient Design**: Modern cybersecurity aesthetic

---

## 🛠️ Technology Stack

### Blockchain & Smart Contracts
- **Solidity** `^0.8.28` - Smart contract language
- **Hardhat** `^2.27.1` - Development environment
- **Ethers.js** `^6.15.0` - Ethereum library

### Development Tools
- **Hardhat Toolbox**: Comprehensive testing suite
- **TypeChain**: TypeScript bindings for contracts
- **Hardhat Gas Reporter**: Gas optimization analysis
- **Solidity Coverage**: Test coverage reports

### Frontend
- **Vanilla JavaScript**: No framework dependencies
- **Ethers.js (Browser)**: Web3 integration
- **CSS3**: Modern animations and gradients
- **Font Awesome**: Icon library
- **Google Fonts**: Inter & Roboto Mono

### Testing & Deployment
- **Chai**: Assertion library
- **Hardhat Network Helpers**: Advanced testing utilities
- **Hardhat Ignition**: Deployment management

---

## 📚 Educational Value

### Learning Objectives

1. **Understand Oracle Risks**: Learn why price oracles are critical attack vectors
2. **Recognize Vulnerable Patterns**: Identify insecure code in real contracts
3. **Implement Access Control**: Master modifier-based security patterns
4. **Analyze Attack Vectors**: Think like an attacker to defend better
5. **Apply Security Best Practices**: Use industry-standard protection mechanisms

### Target Audience

- **Students**: Learning smart contract development
- **Developers**: Building DeFi protocols
- **Auditors**: Conducting security reviews
- **Companies**: Training security teams
- **Community**: Blockchain enthusiasts

### Use Cases

- **University Courses**: Blockchain security curriculum
- **Hackathons**: Security track challenges
- **CTF Competitions**: Capture-the-flag exercises
- **Workshops**: Hands-on security training
- **Self-Study**: Independent learning resource

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Areas for Contribution

- Bug fixes and issue reports
- New attack scenarios
- Documentation improvements
- UI/UX enhancements
- Additional vulnerability patterns
- Test coverage expansion

### Contribution Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ⚠️ Disclaimer

**FOR EDUCATIONAL PURPOSES ONLY**

This project contains intentionally vulnerable smart contracts designed for learning. **NEVER** deploy these contracts to mainnet or use them with real funds. The authors are not responsible for any misuse of this code.

---

## 🙏 Acknowledgments

- **OpenZeppelin**: Security standards and patterns
- **Chainlink**: Decentralized oracle solutions
- **Hardhat Team**: Development environment
- **Ethereum Community**: Ongoing security research
- **DeFi Security Alliance**: Vulnerability disclosures

---

## 📞 Contact & Support

- **E-mail**: yousuffuddin2003@gmail.com

---

## 🔗 Additional Resources

### Recommended Reading
- [Ethereum Smart Contract Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [SWC Registry - Smart Contract Weakness Classification](https://swcregistry.io/)
- [Chainlink Documentation](https://docs.chain.link/)
- [OpenZeppelin Security Audits](https://blog.openzeppelin.com/security-audits/)

### Related Projects
- [Damn Vulnerable DeFi](https://www.damnvulnerabledefi.xyz/)
- [Ethernaut](https://ethernaut.openzeppelin.com/)
- [Capture the Ether](https://capturetheether.com/)

---

<div align="center">

**Built with care for the Blockchain Security Community**

Star this repo if you find it helpful!

</div>

