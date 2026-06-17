import { ethers, network } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Deploying DegreeAttestation...');
  console.log('Network:', network.name);
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH/MATIC');

  const factory = await ethers.getContractFactory('DegreeAttestation');
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('\nDegreeAttestation deployed to:', address);
  console.log('\nUpdate your backend .env:');
  console.log(`CONTRACT_ADDRESS="${address}"`);

  if (network.name !== 'hardhat' && network.name !== 'localhost') {
    console.log('\nWaiting 5 blocks for Polygonscan to index...');
    await contract.deploymentTransaction()?.wait(5);
    console.log('Run to verify:');
    console.log(`npx hardhat verify --network ${network.name} ${address}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
