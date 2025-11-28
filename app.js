// Addresses
// chain 1 (Bad)
const VULNERABLE_ORACLE_ADDRESS = "0xb92B701EBd92bA9149c5f0dc7ad3D198Ec631067";
const VICTIM_CONTRACT_ADDRESS = "0x061f02D3a636e13c0e70A94D82F7515ce787EfDc"; // Renamed for clarity with SECURE_VICTIM_ADDRESS
const ATTACKER_CONTRACT_ADDRESS = "0x99d4A8402200D48B2868Ba7e48F17Cf6529b0D4d";

// chain 2 (Good)
const SECURE_ORACLE_ADDRESS = "0xfAEB346f59b71fd80E4B601A7C38B6BAbC3Ea98C"; // Address of SecuredOracle
const SECURE_VICTIM_ADDRESS = "0xB70f88a906F386202F5463B8c35342A7b5b2BAeC"; // Address of Victim B
const SECURE_ATTACKER_ADDRESS = "0xF881Dca9326F0d8898205531848848b8B30AcFa6"; // Address of Attacker B

// --- NEW: Global Variables for the CURRENTLY ACTIVE Chain ---
let ACTIVE_ORACLE_ADDRESS;
let ACTIVE_VICTIM_ADDRESS;
let ACTIVE_ATTACKER_ADDRESS;

// --- Map the fixed addresses into sets ---
const CHAIN_VULNERABLE = {
    ORACLE: VULNERABLE_ORACLE_ADDRESS,
    VICTIM: VICTIM_CONTRACT_ADDRESS, // Use the base vulnerable victim
    ATTACKER: ATTACKER_CONTRACT_ADDRESS
};

const CHAIN_SECURE = {
    ORACLE: SECURE_ORACLE_ADDRESS,
    VICTIM: SECURE_VICTIM_ADDRESS,
    ATTACKER: SECURE_ATTACKER_ADDRESS
};

// ABI (No changes here, they are generic enough)
const vulnerableOracleAbi = [
  "function setPrice(uint256 _price) public",
  "function getPrice() public view returns (uint256)",
  // Add owner function if you want to display owner for SecuredOracle
  "function owner() public view returns (address)"
];
const victimAbi = [
  "function buyTokens() public payable",
  "function sellTokens(uint256 tokenAmount) public",
  "function balances(address owner) public view returns (uint256)",
];
const attackerAbi = [
  "function attack(uint256 fakePrice) public payable",
  "function drainAndWithdraw() public",
  "function manipulatePrice(uint256 newPrice) public", // Add if your attacker has this
];

// GLOBAL STATE (Add isSecureChain for toggle)
let provider, signer, currentAccount;
let isSecureChain = false; // NEW: Track which chain is active


// --- NEW CORE FUNCTION: Set the Active Chain ---
function setChain(secure) {
    const targetChain = secure ? CHAIN_SECURE : CHAIN_VULNERABLE;

    ACTIVE_ORACLE_ADDRESS = targetChain.ORACLE;
    ACTIVE_VICTIM_ADDRESS = targetChain.VICTIM;
    ACTIVE_ATTACKER_ADDRESS = targetChain.ATTACKER;

    isSecureChain = secure; // Update global state

    // Update UI elements based on active chain
    const oracleTitle = document.querySelector('.oracle-section .card-title');
    const oracleDesc = document.querySelector('.oracle-section .card-desc');
    const victimTitle = document.querySelector('.victim-section .card-title');
    const victimDesc = document.querySelector('.victim-section .card-desc');
    const attackTitle = document.querySelector('.attack-section .card-title');

    if (secure) {
        oracleTitle.innerHTML = '<i class="fa-solid fa-lock" style="color: var(--success);"></i> Secured Oracle';
        oracleDesc.textContent = 'Access controlled price feed. Set price by owner only.';
        victimTitle.innerHTML = '<i class="fa-solid fa-user-shield" style="color: var(--success);"></i> Secured Victim Contract';
        victimDesc.textContent = 'Relies on the secured oracle. Reentrancy Guard active.';
        attackTitle.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Attack Console (Secure Test)';
        showToast("Switched to SECURE Chain", 'info');
    } else {
        oracleTitle.innerHTML = '<i class="fa-solid fa-eye" style="color: var(--primary);"></i> Vulnerable Oracle';
        oracleDesc.textContent = 'Publicly accessible price feed. No access control detected.';
        victimTitle.innerHTML = '<i class="fa-solid fa-user-shield" style="color: var(--success);"></i> Victim Contract';
        victimDesc.textContent = 'Relies on the vulnerable oracle for token pricing.';
        attackTitle.innerHTML = '<i class="fa-solid fa-skull-crossbones"></i> Attack Console';
        showToast("Switched to VULNERABLE Chain", 'info');
    }

    refreshAllViews(); // Refresh data for the new chain
}

// --- NEW CORE FUNCTION: Toggle Chain ---
function toggleChain() {
    setChain(!isSecureChain); // Toggle the state

    // Update button text and style
    const btn = document.getElementById('chainToggle');
    if (isSecureChain) {
        btn.textContent = "Switch to Vulnerable Chain";
        btn.style.background = '#eab308'; // Example yellow/orange for toggle
    } else {
        btn.textContent = "Switch to Secure Chain";
        btn.style.background = '#22c55e'; // Green for toggle
    }
}


// UI UTILS (No changes)
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function setLoading(btnId, isLoading, originalText = '') {
    const btn = document.getElementById(btnId);
    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    } else {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// BLOCKCHAIN ACTIONS (Update to use ACTIVE_ADDRESS variables)
async function connectWallet() {
  if (!window.ethereum) return showToast("MetaMask not detected.", "error");

  setLoading("connectBtn", true);
  provider = new ethers.BrowserProvider(window.ethereum);

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    currentAccount = accounts[0];
    signer = await provider.getSigner();

    const shortAddr = currentAccount.slice(0,6) + "..." + currentAccount.slice(-4);
    document.getElementById("connectBtn").innerHTML = `<i class="fa-solid fa-wallet"></i> ${shortAddr}`;

    // Initialize to vulnerable chain on connect
    setChain(false); // <--- NEW: Initialize chain after wallet connect
    showToast("Wallet connected!", "success");
  } catch (err) {
    console.error(err);
    showToast("Connection failed.", "error");
    setLoading("connectBtn", false, '<i class="fa-solid fa-wallet"></i> Connect Wallet');
  }
}

function getContract(addr, abi, readOnly=false) {
  if(!provider) provider = new ethers.BrowserProvider(window.ethereum);
  return new ethers.Contract(addr, abi, readOnly ? provider : signer);
}

// READ FUNCTIONS (All changed to use ACTIVE_ADDRESS)
async function loadOraclePrice() {
  try {
    const c = getContract(ACTIVE_ORACLE_ADDRESS, vulnerableOracleAbi, true); // Use ACTIVE_ORACLE_ADDRESS
    document.getElementById("oraclePrice").textContent = (await c.getPrice()).toString();
  } catch (e) { console.error(e); }
}

async function loadTokenBalance() {
  if (!currentAccount) return;
  try {
    const c = getContract(ACTIVE_VICTIM_ADDRESS, victimAbi, true); // Use ACTIVE_VICTIM_ADDRESS
    document.getElementById("tokenBalance").textContent = (await c.balances(currentAccount)).toString();
  } catch (e) { console.error(e); }
}

async function loadAttackerBalance() {
  try {
    const c = getContract(ACTIVE_VICTIM_ADDRESS, victimAbi, true); // Use ACTIVE_VICTIM_ADDRESS
    document.getElementById("attackerBalance").textContent = (await c.balances(ACTIVE_ATTACKER_ADDRESS)).toString(); // Use ACTIVE_ATTACKER_ADDRESS
  } catch (e) { console.error(e); }
}

async function loadVictimETHBalance() {
  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
    const balanceWei = await provider.getBalance(ACTIVE_VICTIM_ADDRESS); // Use ACTIVE_VICTIM_ADDRESS
    const balanceEth = ethers.formatEther(balanceWei);

    const box = document.getElementById("victimEthBalance");
    if (box) box.textContent = balanceEth + " ETH";
  } catch (error) {
    console.error("Failed to load victim ETH balance:", error);
  }
}

// WRITE FUNCTIONS (All changed to use ACTIVE_ADDRESS)
async function updateOraclePrice() {
  if (!signer) return showToast("Please connect wallet first.", "error");

  setLoading("setPriceBtn", true);
  try {
    const c = getContract(ACTIVE_ORACLE_ADDRESS, vulnerableOracleAbi); // Use ACTIVE_ORACLE_ADDRESS
    const tx = await c.setPrice(document.getElementById("fakePriceInput").value);
    showToast("Transaction sent...", "info");
    await tx.wait();
    await refreshAllViews();
    showToast("Price updated successfully!", "success");
  } catch (e) {
    console.error(e);
    // Specific error handling for secure chain
    if (isSecureChain && e.message.includes("You are not the owner")) {
        showToast("Secured Oracle: Price change blocked by access control!", "success"); // Success for security demo
    } else {
        showToast("Transaction failed.", "error");
    }
  } finally {
    setLoading("setPriceBtn", false);
  }
}

async function buyTokens() {
  if (!signer) return showToast("Please connect wallet first.", "error");

  setLoading("buyTokensBtn", true);
  try {
    const c = getContract(ACTIVE_VICTIM_ADDRESS, victimAbi); // Use ACTIVE_VICTIM_ADDRESS
    const val = ethers.parseEther(document.getElementById("ethAmountInput").value);
    const tx = await c.buyTokens({ value: val });
    showToast("Buying tokens...", "info");
    await tx.wait();
    await refreshAllViews();
    showToast("Tokens purchased!", "success");
  } catch (e) {
    console.error(e);
    // Specific error handling for secure chain (e.g., reentrancy guard)
    if (isSecureChain && e.message.includes("Reentrancy Guard")) {
        showToast("Secured Victim: Reentrancy guard blocked unexpected call!", "success");
    } else {
        showToast("Transaction failed.", "error");
    }
  } finally {
    setLoading("buyTokensBtn", false);
  }
}

async function runAttack() {
  if (!signer) return showToast("Please connect wallet first.", "error");

  setLoading("runAttackBtn", true);
  try {
    const c = getContract(ACTIVE_ATTACKER_ADDRESS, attackerAbi); // Use ACTIVE_ATTACKER_ADDRESS
    const price = document.getElementById("attackPriceInput").value;
    const val = ethers.parseEther(document.getElementById("attackEthInput").value);
    const tx = await c.attack(price, { value: val });
    showToast("Executing attack...", "info");
    await tx.wait();
    await refreshAllViews();
    showToast("Attack Executed! Check Loot.", "success");
  } catch (e) {
    console.error(e);
    // Specific error handling for secure chain
    if (isSecureChain && e.message.includes("Security Alert")) {
        showToast("Secured Chain: Attack correctly blocked by Oracle access control!", "success"); // Success for security demo
    } else if (isSecureChain && e.message.includes("Reentrancy Guard")) {
        showToast("Secured Chain: Attack failed due to Reentrancy Guard!", "success"); // Success for security demo
    } else {
        showToast("Attack failed.", "error");
    }
  } finally {
    setLoading("runAttackBtn", false);
  }
}

async function cashOut() {
    if (!signer) return showToast("Please connect wallet first.", "error");

    setLoading("cashOutBtn", true);
    try {
        const c = getContract(ACTIVE_ATTACKER_ADDRESS, attackerAbi); // Use ACTIVE_ATTACKER_ADDRESS
        const tx = await c.drainAndWithdraw();
        showToast("Draining funds...", "info");
        await tx.wait();
        await refreshAllViews();
        showToast("Funds drained to your wallet!", "success");
    } catch(e) {
        console.error(e);
        // Specific error handling for secure chain
        if (isSecureChain && e.message.includes("Security Alert")) { // Example if drainAndWithdraw also calls secured oracle
            showToast("Secured Chain: Drain blocked by Oracle access control!", "success");
        } else {
            showToast("Cash out failed.", "error");
        }
    } finally {
        setLoading("cashOutBtn", false);
    }
}



async function refreshAllViews() {
  await loadOraclePrice();
  await loadTokenBalance();
  await loadAttackerBalance();
  await loadVictimETHBalance();
  // We need to refresh the UI elements that describe the chain itself
  const chainStatusElement = document.getElementById('chainStatus');
  if (chainStatusElement) {
    chainStatusElement.textContent = isSecureChain ? "Active: SECURE Chain" : "Active: VULNERABLE Chain";
    chainStatusElement.style.color = isSecureChain ? '#4ade80' : '#fca5a5';
  }
}

// INIT
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("connectBtn").addEventListener("click", connectWallet);
  document.getElementById("setPriceBtn").addEventListener("click", updateOraclePrice);
  document.getElementById("buyTokensBtn").addEventListener("click", buyTokens);
  document.getElementById("runAttackBtn").addEventListener("click", runAttack);
  document.getElementById("cashOutBtn").addEventListener("click", cashOut);



  // NEW: Add event listener for the toggle button
  document.getElementById("chainToggle").addEventListener("click", toggleChain);


  if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => window.location.reload());
    window.ethereum.on('chainChanged', () => window.location.reload());
  }

  // Initialize the chain state on page load, *before* connectWallet might run
  setChain(false); // Start with the vulnerable chain by default
});