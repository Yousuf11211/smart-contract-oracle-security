const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. Deploy Oracles
  const VulnerableOracle = await hre.ethers.getContractFactory("VulnerableOracle");
  const vulnerableOracle = await VulnerableOracle.deploy();
  await vulnerableOracle.waitForDeployment();
  console.log("VulnerableOracle deployed to:", vulnerableOracle.target);

  const SecureOracle = await hre.ethers.getContractFactory("SecureOracle");
  const secureOracle = await SecureOracle.deploy();
  await secureOracle.waitForDeployment();
  console.log("SecureOracle deployed to:", secureOracle.target);

  // 2. Deploy Victim (The Bank)
  const VictimContract = await hre.ethers.getContractFactory("VictimContract");
  const victim = await VictimContract.deploy(vulnerableOracle.target);
  await victim.waitForDeployment();
  console.log("VictimContract deployed to:", victim.target);

  // 3. Fund the Bank with 50 ETH
  await deployer.sendTransaction({
    to: victim.target,
    value: hre.ethers.parseEther("50.0")
  });
  console.log("Victim funded with 50 ETH");

  // 4. Deploy Attacker
  const Attacker = await hre.ethers.getContractFactory("Attacker");
  const attacker = await Attacker.deploy(victim.target, vulnerableOracle.target);
  await attacker.waitForDeployment();
  console.log("Attacker deployed to:", attacker.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});