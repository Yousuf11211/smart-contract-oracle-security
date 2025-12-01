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
  // The Victim needs to know which Oracle to trust.
  // For this demo, let's keep the Victim on the Vulnerable Oracle so we can switch Attacker targets.
  // Ideally, you'd deploy TWO victims (SafeVictim and VulnVictim), but for the attack demo:
  const victim = await VictimContract.deploy(vulnerableOracle.target);
  await victim.waitForDeployment();
  console.log("VictimContract deployed to:", victim.target);

  // 3. Fund the Victim
  await deployer.sendTransaction({
    to: victim.target,
    value: hre.ethers.parseEther("50.0")
  });
  console.log("Victim funded with 50 ETH");

  // 4. Deploy TWO Attackers
  const Attacker = await hre.ethers.getContractFactory("Attacker");

  // Attacker 1: Targets Vulnerable Oracle (Succeeds)
  const attackerVuln = await Attacker.deploy(victim.target, vulnerableOracle.target);
  await attackerVuln.waitForDeployment();
  console.log("AttackerVuln deployed to:", attackerVuln.target);

  // Attacker 2: Targets Secure Oracle (Fails)
  const attackerSecure = await Attacker.deploy(victim.target, secureOracle.target);
  await attackerSecure.waitForDeployment();
  console.log("AttackerSecure deployed to:", attackerSecure.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});