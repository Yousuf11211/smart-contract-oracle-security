// ====== CONFIG: FILL THESE AFTER DEPLOYING CONTRACTS ======
const VULNERABLE_ORACLE_ADDRESS = "0x421644DC139096d9FBe89949926F1564b93C7C7F";
const VICTIM_CONTRACT_ADDRESS = "0xa6551042e0F3e9455ae7BBCE7Bb2708F5720ed69";
const ATTACKER_CONTRACT_ADDRESS = "0x304E58107bb744196cF2cF3E71037bfcFdc1B32C";

// Match your Solidity functions:
const vulnerableOracleAbi = [
  "function setPrice(uint256 _price) public",
  "function getPrice() public view returns (uint256)",
];

const victimAbi = [
  "function buyTokens() public payable",
  "function balances(address owner) public view returns (uint256)",
];

const attackerAbi = [
  "function attack(uint256 fakePrice) public payable",
  "function manipulatePrice(uint256 newPrice) public",
];

// ====== GLOBAL STATE ======
let provider = null;
let signer = null;
let currentAccount = null;

// ====== HELPERS ======
async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not detected. Please install MetaMask.");
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    currentAccount = accounts[0];
    signer = await provider.getSigner();

    const btn = document.getElementById("connectBtn");
    if (btn) {
      btn.textContent =
        "Connected: " +
        currentAccount.slice(0, 6) +
        "..." +
        currentAccount.slice(-4);
    }

    await refreshAllViews();
  } catch (err) {
    console.error("Wallet connection failed:", err);
  }
}

function getOracleContract(readOnly = false) {
  if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
  const runner = readOnly ? provider : signer ?? provider;
  return new ethers.Contract(
    VULNERABLE_ORACLE_ADDRESS,
    vulnerableOracleAbi,
    runner
  );
}

function getVictimContract(readOnly = false) {
  if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
  const runner = readOnly ? provider : signer ?? provider;
  return new ethers.Contract(VICTIM_CONTRACT_ADDRESS, victimAbi, runner);
}

function getAttackerContract() {
  if (!provider) provider = new ethers.BrowserProvider(window.ethereum);
  const runner = signer ?? provider;
  return new ethers.Contract(ATTACKER_CONTRACT_ADDRESS, attackerAbi, runner);
}

// ====== UI ACTIONS ======
async function loadOraclePrice() {
  try {
    const oracle = getOracleContract(true);
    const price = await oracle.getPrice();
    document.getElementById("oraclePrice").textContent = price.toString();
  } catch (err) {
    console.error("Failed to load oracle price:", err);
    document.getElementById("oraclePrice").textContent = "error";
  }
}

async function updateOraclePrice() {
  if (!signer) {
    alert("Connect wallet first.");
    return;
  }

  const input = document.getElementById("fakePriceInput");
  const value = input.value.trim();
  if (!value) {
    alert("Enter a fake price.");
    return;
  }

  try {
    const oracle = getOracleContract(false);
    const tx = await oracle.setPrice(value);
    await tx.wait();
    await loadOraclePrice();
  } catch (err) {
    console.error("Failed to set price:", err);
    alert("Failed to set price. See console.");
  }
}

async function loadTokenBalance() {
  if (!currentAccount) {
    document.getElementById("tokenBalance").textContent = "0";
    return;
  }

  try {
    const victim = getVictimContract(true);
    const bal = await victim.balances(currentAccount);
    document.getElementById("tokenBalance").textContent = bal.toString();
  } catch (err) {
    console.error("Failed to load token balance:", err);
  }
}

async function buyTokens() {
  if (!signer || !currentAccount) {
    alert("Connect wallet first.");
    return;
  }

  const ethInput = document.getElementById("ethAmountInput");
  const amountStr = ethInput.value.trim();
  if (!amountStr || Number(amountStr) <= 0) {
    alert("Enter an ETH amount.");
    return;
  }

  try {
    const victim = getVictimContract(false);
    const value = ethers.parseEther(amountStr);
    const tx = await victim.buyTokens({ value });
    await tx.wait();
    await loadTokenBalance();
  } catch (err) {
    console.error("Failed to buy tokens:", err);
    alert("Failed to buy tokens. See console.");
  }
}

async function runAttack() {
  if (!signer || !currentAccount) {
    alert("Connect wallet first.");
    return;
  }

  const fakePriceInput = document.getElementById("attackPriceInput");
  const ethInput = document.getElementById("attackEthInput");
  const fakePrice = fakePriceInput.value.trim();
  const ethAmount = ethInput.value.trim();

  if (!fakePrice) {
    alert("Enter a fake price for the attack.");
    return;
  }
  if (!ethAmount || Number(ethAmount) <= 0) {
    alert("Enter an ETH amount for the attack.");
    return;
  }

  try {
    const attacker = getAttackerContract();
    const value = ethers.parseEther(ethAmount);
    const tx = await attacker.attack(fakePrice, { value });
    await tx.wait();
    await loadOraclePrice();
    await loadTokenBalance();
    alert("Attack executed. Check oracle price and token balance.");
  } catch (err) {
    console.error("Attack failed:", err);
    alert("Attack failed. See console.");
  }
}

// ====== INIT ======
async function refreshAllViews() {
  await loadOraclePrice();
  await loadTokenBalance();
}

window.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("connectBtn")
    .addEventListener("click", connectWallet);
  document
    .getElementById("setPriceBtn")
    .addEventListener("click", updateOraclePrice);
  document
    .getElementById("buyTokensBtn")
    .addEventListener("click", buyTokens);
  document
    .getElementById("runAttackBtn")
    .addEventListener("click", runAttack);

  // Try to connect silently if MetaMask already authorized
  if (window.ethereum) {
    window.ethereum
      .request({ method: "eth_accounts" })
      .then(async (accounts) => {
        if (accounts && accounts.length > 0) {
          currentAccount = accounts[0];
          provider = new ethers.BrowserProvider(window.ethereum);
          signer = await provider.getSigner();
          document.getElementById("connectBtn").textContent =
            "Connected: " +
            currentAccount.slice(0, 6) +
            "..." +
            currentAccount.slice(-4);
        }
        await refreshAllViews();
      })
      .catch((err) => {
        console.error("Silent connect failed:", err);
      });
  } else {
    loadOraclePrice(); // still try to load (will likely fail until provider set)
  }
});
