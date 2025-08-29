import { ethers } from "hardhat";

async function main() {
  const args = process.argv.slice(2);
  let universalAddress = "";
  let connectedAddress = "";
  let zrc20Address = "";

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--universal") {
      universalAddress = args[i + 1];
    } else if (args[i] === "--connected") {
      connectedAddress = args[i + 1];
    } else if (args[i] === "--zrc20") {
      zrc20Address = args[i + 1];
    }
  }

  if (!universalAddress || !connectedAddress || !zrc20Address) {
    console.error("Usage: yarn configure --universal <address> --connected <address> --zrc20 <address>");
    process.exit(1);
  }

  console.log("Configuring Universal NFT with:");
  console.log("Universal address:", universalAddress);
  console.log("Connected address:", connectedAddress);
  console.log("ZRC-20 address:", zrc20Address);

  const [deployer] = await ethers.getSigners();
  const UniversalNFT = await ethers.getContractFactory("UniversalNFT");
  const universalNft = UniversalNFT.attach(universalAddress);

  // Set connected contract
  console.log("Setting connected contract...");
  const tx = await universalNft.setConnected(zrc20Address, connectedAddress);
  await tx.wait();

  console.log("Configuration complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });