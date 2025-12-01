// --- UPDATED ADDRESSES (PASTE YOUR LATEST DEPLOYMENT ADDRESSES HERE) ---
const VULNERABLE_ORACLE_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const SECURE_ORACLE_ADDRESS     = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const VICTIM_VULN_ADDRESS       = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const VICTIM_SECURE_ADDRESS     = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

const ATTACKER_VULN_ADDRESS     = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
const ATTACKER_SECURE_ADDRESS   = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";

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
  "function collateralBalance(address) public view returns (uint256)",
  "function borrowedBalance(address) public view returns (uint256)"
];

const attackerAbi = [
  "function flashAttack() public"
];

// --- CORE FUNCTIONS ---
function setChain(secure) {
    isSecureChain = secure;
    activeOracle = secure ? SECURE_ORACLE_ADDRESS : VULNERABLE_ORACLE_ADDRESS;
    activeVictim = secure ? VICTIM_SECURE_ADDRESS : VICTIM_VULN_ADDRESS;
    activeAttacker = secure ? ATTACKER_SECURE_ADDRESS : ATTACKER_VULN_ADDRESS;

    // Update UI Text
    document.getElementById("chainStatus").innerText = secure ? "Active: SECURE ORACLE" : "Active: VULNERABLE ORACLE";
    document.getElementById("chainStatus").style.color = secure ? "#4ade80" : "#fca5a5";

    // Refresh data immediately
    refreshData();
}

async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask!");
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });

    handleAccountChange(accounts[0]);

    // Setup Listener for Account Switching (FIX FOR STALE ACCOUNTS)
    window.ethereum.on('accountsChanged', (accounts) => {
        handleAccountChange(accounts[0]);
    });

    // Default to Vulnerable Chain on load
    setChain(false);
}

async function handleAccountChange(newAccount) {
    currentAccount = newAccount;
    document.getElementById("connectBtn").innerText = "Connected: " + currentAccount.slice(0,6);
    // Re-initialize signer for the new account
    signer = await provider.getSigner();
    refreshData();
}

// --- READ DATA ---
async function loadVictimETHBalance() {
    if (!provider || !activeVictim) return;
    try {
        const balanceWei = await provider.getBalance(activeVictim);
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

    await loadVictimETHBalance();

    // 1. Get Price
    try {
        const price = await oracle.getPrice();
        document.getElementById("oraclePrice").innerText = ethers.formatEther(price) + " ETH";
    } catch (e) {
        document.getElementById("oraclePrice").innerText = "Error";
    }

    // 2. Get Collateral Factor
    try {
        const factor = await victim.collateralFactor();
        document.getElementById("currentFactorDisplay").innerText = factor.toString() + "%";
    } catch (e) { console.log("Error fetching factor"); }

    // 3. Get Your Collateral Balance
    try {
        const myCollat = await victim.collateralBalance(currentAccount);
        document.getElementById("userCollateral").innerText = myCollat.toString() + " Gold";
    } catch (e) { console.log("Error fetching collateral"); }

    // 4. Get Your Current Debt
    try {
        const myDebtWei = await victim.borrowedBalance(currentAccount);
        const myDebtEth = ethers.formatEther(myDebtWei);
        document.getElementById("userDebt").innerText = parseFloat(myDebtEth).toFixed(2) + " ETH";
    } catch (e) { console.log("Error fetching debt"); }
}

// --- WRITE FUNCTIONS ---

async function fundBank() {
    if (!signer) return alert("Please connect wallet first.");
    const amount = document.getElementById("depositEthInput").value;
    if (!amount) return alert("Enter an amount to fund.");
    try {
        const tx = await signer.sendTransaction({ to: activeVictim, value: ethers.parseEther(amount) });
        await tx.wait();
        refreshData();
        alert("Bank successfully funded!");
    } catch (e) { console.error(e); alert("Funding failed."); }
}

async function updateSafetyDial() {
    const victim = new ethers.Contract(activeVictim, victimAbi, signer);
    const newFactor = document.getElementById("safetyDialInput").value;
    try {
        const tx = await victim.setCollateralFactor(newFactor);
        await tx.wait();
        alert("Safety Factor Updated!");
        refreshData();
    } catch (err) { console.error(err); alert("Update Failed (Are you the owner?)"); }
}

async function depositCollateral() {
    const victim = new ethers.Contract(activeVictim, victimAbi, signer);
    try {
        const tx = await victim.depositCollateral();
        await tx.wait();
        refreshData();
    } catch (err) { console.error(err); alert("Deposit Failed"); }
}

// --- NEW FUNCTION: Custom Borrow ---
async function borrowCustomAmount() {
    if (!signer) return alert("Connect Wallet!");
    const amount = document.getElementById("borrowInput").value;
    if (!amount) return alert("Enter amount to borrow");

    const victim = new ethers.Contract(activeVictim, victimAbi, signer);

    try {
        const tx = await victim.borrowETH(ethers.parseEther(amount));
        await tx.wait();
        refreshData();
        alert(`Successfully borrowed ${amount} ETH!`);
    } catch (err) {
        console.error(err);

        // Extract error reason
        let reason = "Unknown Error";
        if (err.reason) reason = err.reason;
        else if (err.info && err.info.error && err.info.error.message) reason = err.info.error.message;

        alert("Borrow Failed: " + reason);
    }
}
// ------------------------------------

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

async function runFlashAttack() {
    const attacker = new ethers.Contract(activeAttacker, attackerAbi, signer);
    const balanceBefore = await provider.getBalance(activeVictim);
    try {
        const tx = await attacker.flashAttack({ gasLimit: 30000000 });
        await tx.wait();
        const balanceAfter = await provider.getBalance(activeVictim);
        refreshData();
        const moneyWasStolen = (balanceBefore > 0n) && (balanceAfter < balanceBefore);
        if (moneyWasStolen) {
            alert("BOOM! Flash Loan Attack Executed. Bank Drained.");
        } else {
            alert("Attack Executed but FAILED to drain funds! (Secure Oracle did its job).");
        }
    } catch (err) {
        console.error(err);
        if (isSecureChain) {
            alert("Attack BLOCKED! The transaction reverted (Secure Oracle rejected the price change).");
        } else {
            alert("Attack FAILED! (Check console).");
        }
    }
}

// --- MANUAL LAB FUNCTIONS ---
async function manualPump() {
    document.getElementById("fakePriceInput").value = "1000";
    await manipulateOracle();
}

async function manualDrain() {
    if (!signer) return alert("Connect Wallet!");
    const victim = new ethers.Contract(activeVictim, victimAbi, signer);

    const bankBalance = await provider.getBalance(activeVictim);
    const readableBalance = ethers.formatEther(bankBalance);

    if (parseFloat(readableBalance) === 0) return alert("Bank is already empty!");

    try {
        const tx = await victim.borrowETH(bankBalance);
        await tx.wait();
        refreshData();
        alert(`Successfully drained ${readableBalance} ETH!`);
    } catch (err) {
        console.error(err);

        // FIX: Try to extract the actual error message from the contract
        let reason = "Unknown Error";
        if (err.reason) reason = err.reason;
        else if (err.info && err.info.error && err.info.error.message) reason = err.info.error.message;

        // This will now show: "Shortfall: Not enough collateral value!"
        alert("Transaction Failed: " + reason);
    }
}

// --- INITIALIZATION ---
window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("connectBtn").onclick = connectWallet;
    document.getElementById("depositBtn").onclick = depositCollateral;
    document.getElementById("updateFactorBtn").onclick = updateSafetyDial;
    document.getElementById("setPriceBtn").onclick = manipulateOracle;
    document.getElementById("attackBtn").onclick = runFlashAttack;
    document.getElementById("chainToggle").onclick = () => setChain(!isSecureChain);
    document.getElementById("fundBankBtn").onclick = fundBank;

    // Manual Lab Buttons
    document.getElementById("manualDepositBtn").onclick = depositCollateral;
    document.getElementById("manualManipulateBtn").onclick = manualPump;
    document.getElementById("manualBorrowBtn").onclick = manualDrain;

    // NEW: Custom Borrow Button Listener
    document.getElementById("customBorrowBtn").onclick = borrowCustomAmount;
});