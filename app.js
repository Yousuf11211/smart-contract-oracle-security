// Addresses
// chain 1 (Bad)
const VULNERABLE_ORACLE_ADDRESS = "0xb92B701EBd92bA9149c5f0dc7ad3D198Ec631067";
const VICTIM_ADDRESS = "0x061f02D3a636e13c0e70A94D82F7515ce787EfDc";
const ATTACKER_ADDRESS = "0x99d4A8402200D48B2868Ba7e48F17Cf6529b0D4d";

// chain 2 (Good)
const SECURE_ORACLE_ADDRESS = "0xfAEB346f59b71fd80E4B601A7C38B6BAbC3Ea98C"; // Address of SecuredOracle
const SECURE_VICTIM_ADDRESS = "0xB70f88a906F386202F5463B8c35342A7b5b2BAeC"; // Address of Victim B
const SECURE_ATTACKER_ADDRESS = "0xF881Dca9326F0d8898205531848848b8B30AcFa6"; // Address of Attacker B

// ABI
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

// GLOBAL STATE
let provider, signer, currentAccount;

// UI UTILS
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-triangle';
    
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    
    container.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function setLoading(btnId, isLoading, originalText = '') {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    if (isLoading) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner"></div> Processing...';
        btn.disabled = true;
    } else {
        btn.innerHTML = originalText || btn.dataset.originalText;
        btn.disabled = false;
    }
}

// TABS & UI
function switchTab(tabName) {
  const attackView = document.getElementById('attack-view');
  const scannerView = document.getElementById('scanner-view');
  
  if (tabName === 'attack') {
      attackView.classList.remove('hidden');
      scannerView.classList.add('hidden');
  } else {
      attackView.classList.add('hidden');
      scannerView.classList.remove('hidden');
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
    reader.onload = (e) => {
        document.getElementById("codeInput").value = e.target.result;
        showToast("File loaded successfully", "success");
    };
    reader.readAsText(file);
}

// BLOCKCHAIN ACTIONS
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
    
    await refreshAllViews();
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

// READ FUNCTIONS
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

// WRITE FUNCTIONS
async function updateOraclePrice() {
  if (!signer) return showToast("Please connect wallet first.", "error");
  
  setLoading("setPriceBtn", true);
  try {
    const c = getContract(VULNERABLE_ORACLE_ADDRESS, vulnerableOracleAbi);
    const tx = await c.setPrice(document.getElementById("fakePriceInput").value);
    showToast("Transaction sent...", "info");
    await tx.wait();
    await refreshAllViews();
    showToast("Price updated successfully!", "success");
  } catch (e) {
    console.error(e);
    showToast("Transaction failed.", "error");
  } finally {
    setLoading("setPriceBtn", false);
  }
}

async function buyTokens() {
  if (!signer) return showToast("Please connect wallet first.", "error");
  
  setLoading("buyTokensBtn", true);
  try {
    const c = getContract(VICTIM_CONTRACT_ADDRESS, victimAbi);
    const val = ethers.parseEther(document.getElementById("ethAmountInput").value);
    const tx = await c.buyTokens({ value: val });
    showToast("Buying tokens...", "info");
    await tx.wait();
    await refreshAllViews();
    showToast("Tokens purchased!", "success");
  } catch (e) {
    console.error(e);
    showToast("Transaction failed.", "error");
  } finally {
    setLoading("buyTokensBtn", false);
  }
}

async function runAttack() {
  if (!signer) return showToast("Please connect wallet first.", "error");
  
  setLoading("runAttackBtn", true);
  try {
    const c = getContract(ATTACKER_CONTRACT_ADDRESS, attackerAbi);
    const price = document.getElementById("attackPriceInput").value;
    const val = ethers.parseEther(document.getElementById("attackEthInput").value);
    const tx = await c.attack(price, { value: val });
    showToast("Executing attack...", "info");
    await tx.wait();
    await refreshAllViews();
    showToast("Attack Executed! Check Loot.", "success");
  } catch (e) {
    console.error(e);
    showToast("Attack failed.", "error");
  } finally {
    setLoading("runAttackBtn", false);
  }
}

async function cashOut() {
    if (!signer) return showToast("Please connect wallet first.", "error");
    
    setLoading("cashOutBtn", true);
    try {
        const c = getContract(ATTACKER_CONTRACT_ADDRESS, attackerAbi);
        const tx = await c.drainAndWithdraw();
        showToast("Draining funds...", "info");
        await tx.wait();
        await refreshAllViews();
        showToast("Funds drained to your wallet!", "success");
    } catch(e) {
        console.error(e);
        showToast("Cash out failed.", "error");
    } finally {
        setLoading("cashOutBtn", false);
    }
}

// SCANNER LOGIC
function analyzeCode() {
  const code = document.getElementById("codeInput").value;
  const resultBox = document.getElementById("scanResult");
  const msgBox = document.getElementById("scanMessage");
  const btn = document.getElementById("scanBtn");

  if (!code.trim()) return showToast("Please enter some code first.", "error");

  setLoading("scanBtn", true);
  resultBox.style.display = "none";

  // Simulate delay for realism
  setTimeout(() => {
      resultBox.style.display = "block";
      let findings = [];

      if (/function\s+setPrice\s*\([^)]*\)\s*public/.test(code) && !/onlyOwner|require\(\s*msg\.sender/.test(code)) {
        findings.push('<i class="fa-solid fa-triangle-exclamation"></i> [CRITICAL] "setPrice" is public without access control.');
      }

      if (code.includes(".getPrice()") && !code.includes("AggregatorV3Interface")) {
        findings.push('<i class="fa-solid fa-circle-exclamation"></i> [HIGH] Insecure custom oracle usage detected.');
      }

      if (code.includes("* price") || code.includes("* oracle.getPrice()")) {
        findings.push('<i class="fa-solid fa-info-circle"></i> [INFO] Direct price multiplication. Check for overflow/decimals.');
      }

      if (findings.length > 0) {
        msgBox.innerHTML = findings.join("<br><br>");
        resultBox.style.borderColor = "#f472b6"; // danger color
        msgBox.style.color = "#f472b6";
        showToast("Vulnerabilities detected!", "error");
      } else {
        msgBox.textContent = "No obvious oracle vulnerabilities found.";
        resultBox.style.borderColor = "#4ade80"; // success color
        msgBox.style.color = "#4ade80";
        showToast("Analysis complete. Code looks clean.", "success");
      }
      
      setLoading("scanBtn", false);
  }, 800);
}

async function refreshAllViews() {
  await loadOraclePrice();
  await loadTokenBalance();
  await loadAttackerBalance();
  await loadVictimETHBalance();
}

// INIT
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("connectBtn").addEventListener("click", connectWallet);
  document.getElementById("setPriceBtn").addEventListener("click", updateOraclePrice);
  document.getElementById("buyTokensBtn").addEventListener("click", buyTokens);
  document.getElementById("runAttackBtn").addEventListener("click", runAttack);
  document.getElementById("cashOutBtn").addEventListener("click", cashOut);

  document.getElementById("scanBtn").addEventListener("click", analyzeCode);
  document.getElementById("fileUpload").addEventListener("change", handleFileUpload);

  if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => window.location.reload());
    window.ethereum.on('chainChanged', () => window.location.reload());
  }
});