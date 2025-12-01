const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // ====================================================
  // 1. Deploy Oracles
  // ====================================================
  const VulnerableOracle = await hre.ethers.getContractFactory("VulnerableOracle");
  const vulnerableOracle = await VulnerableOracle.deploy();
  await vulnerableOracle.waitForDeployment();
  console.log("VulnerableOracle deployed to:", vulnerableOracle.target);

  const SecureOracle = await hre.ethers.getContractFactory("SecureOracle");
  const secureOracle = await SecureOracle.deploy();
  await secureOracle.waitForDeployment();
  console.log("SecureOracle deployed to:", secureOracle.target);

  // ====================================================
  // 2. Deploy Victims (The Banks)
  // ====================================================
  const VictimContract = await hre.ethers.getContractFactory("VictimContract");

  // Victim 1: The Vulnerable Bank (Trusts the Vulnerable Oracle)
  const victimVuln = await VictimContract.deploy(vulnerableOracle.target);
  await victimVuln.waitForDeployment();
  console.log("Victim_VULNERABLE deployed to:", victimVuln.target);

  // Victim 2: The Secure Bank (Trusts the Secure Oracle)
  const victimSecure = await VictimContract.deploy(secureOracle.target);
  await victimSecure.waitForDeployment();
  console.log("Victim_SECURE deployed to:", victimSecure.target);

  // ====================================================
  // 3. Fund BOTH Victims
  // ====================================================
  const fundingAmount = hre.ethers.parseEther("50.0");

  await deployer.sendTransaction({
    to: victimVuln.target,
    value: fundingAmount
  });
  console.log("Victim_VULNERABLE funded with 50 ETH");

  await deployer.sendTransaction({
    to: victimSecure.target,
    value: fundingAmount
  });
  console.log("Victim_SECURE funded with 50 ETH");

  // ====================================================
  // 4. Deploy TWO Attackers
  // ====================================================
  const Attacker = await hre.ethers.getContractFactory("Attacker");

  // Attacker 1: Targets Vulnerable Stack (Should SUCCEED)
  const attackerVuln = await Attacker.deploy(victimVuln.target, vulnerableOracle.target);
  await attackerVuln.waitForDeployment();
  console.log("Attacker_VULN deployed to:", attackerVuln.target);

  // Attacker 2: Targets Secure Stack (Should FAIL)
  const attackerSecure = await Attacker.deploy(victimSecure.target, secureOracle.target);
  await attackerSecure.waitForDeployment();
  console.log("Attacker_SECURE deployed to:", attackerSecure.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});