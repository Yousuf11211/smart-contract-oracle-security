// --- UPDATED ADDRESSES (PASTE FROM YOUR TERMINAL DEPLOYMENT) ---
const VULNERABLE_ORACLE_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const SECURE_ORACLE_ADDRESS     = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// UPDATE 1: SEPARATE VICTIM ADDRESSES
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
  "function collateralBalance(address) public view returns (uint256)"
];

const attackerAbi = [
  "function flashAttack() public"
];

// --- CORE FUNCTIONS ---
function setChain(secure) {
    isSecureChain = secure;
    activeOracle = secure ? SECURE_ORACLE_ADDRESS : VULNERABLE_ORACLE_ADDRESS;

    // UPDATE 2: DYNAMIC VICTIM SWITCHING
    activeVictim = secure ? VICTIM_SECURE_ADDRESS : VICTIM_VULN_ADDRESS;

    activeAttacker = secure ? ATTACKER_SECURE_ADDRESS : ATTACKER_VULN_ADDRESS;

    // Update UI Text
    document.getElementById("chainStatus").innerText = secure ? "Active: SECURE ORACLE" : "Active: VULNERABLE ORACLE";
    document.getElementById("chainStatus").style.color = secure ? "#4ade80" : "#fca5a5";

    // Refresh data immediately to show the balance of the ACTIVE bank
    refreshData();
}

async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask!");
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    currentAccount = accounts[0];

    document.getElementById("connectBtn").innerText = "Connected: " + currentAccount.slice(0,6);

    // Default to Vulnerable Chain on load
    setChain(false);
}

// --- READ DATA ---
async function loadVictimETHBalance() {
    if (!provider || !activeVictim) return;
    try {
        // UPDATE 3: Read balance from the ACTIVE victim, not a hardcoded one
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

    await loadVictimETHBalance(); // Update Bank Balance

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
    } catch (e) {
        console.log("Could not fetch factor (maybe contract not deployed?)");
    }

    // 3. Get Your Collateral Balance
    try {
        const myCollat = await victim.collateralBalance(currentAccount);
        document.getElementById("userCollateral").innerText = myCollat.toString() + " Gold";
    } catch (e) {
        console.log("Could not fetch collateral balance");
    }
}

// --- WRITE FUNCTIONS ---

// 1. Fund the Bank
async function fundBank() {
    if (!signer) return alert("Please connect wallet first.");
    const amount = document.getElementById("depositEthInput").value;
    if (!amount) return alert("Enter an amount to fund.");

    try {
        // UPDATE 4: Fund the ACTIVE victim
        const tx = await signer.sendTransaction({
            to: activeVictim,
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
// 5. Attacker: The Atomic Flash Loan (SMARTER VERSION)
async function runFlashAttack() {
    const attacker = new ethers.Contract(activeAttacker, attackerAbi, signer);

    // 1. Check Bank Balance BEFORE the attack
    const balanceBefore = await provider.getBalance(activeVictim);

    try {
        // GAS FIX: We manually set gasLimit to ensure complex transaction passes
        const tx = await attacker.flashAttack({ gasLimit: 30000000 });
        await tx.wait(); // Wait for the blockchain to process it

        // 2. Check Bank Balance AFTER the attack
        const balanceAfter = await provider.getBalance(activeVictim);

        refreshData();

        // 3. COMPARE: Did the money actually move?
        // We use a small threshold (0.01 ETH) to account for dust,
        // but generally, if it was 50 and is now 0, the logic holds.
        const moneyWasStolen = (balanceBefore > 0n) && (balanceAfter < balanceBefore);

        if (moneyWasStolen) {
            alert("BOOM! Flash Loan Attack Executed. Bank Drained.");
        } else {
            // If we are here, the transaction didn't revert, but the money didn't move.
            // This happens on the Secure Chain because the logic blocked the price change internally.
            alert("Attack Executed but FAILED to drain funds! (Secure Oracle did its job).");
        }

    } catch (err) {
        console.error(err);

        // This block catches if the transaction REVERTS (crashes) entirely
        if (isSecureChain) {
            alert("Attack BLOCKED! The transaction reverted (Secure Oracle rejected the price change).");
        } else {
            alert("Attack FAILED! (Check console: Bank might be empty, or Gas too low).");
        }
    }
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

    // UPDATE 5: Check balance of the ACTIVE victim
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