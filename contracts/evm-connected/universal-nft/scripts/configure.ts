import { ethers } from "hardhat";

async function main() {
  const args = process.argv.slice(2);
  let connectedAddress = "";
  let universalAddress = "";

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--connected") {
      connectedAddress = args[i + 1];
    } else if (args[i] === "--universal") {
      universalAddress = args[i + 1];
    }
  }

  if (!connectedAddress || !universalAddress) {
    console.error("Usage: yarn configure --connected <address> --universal <address>");
    process.exit(1);
  }

  console.log("Configuring Connected NFT with:");
  console.log("Connected address:", connectedAddress);
  console.log("Universal address:", universalAddress);

  const [deployer] = await ethers.getSigners();
  const ConnectedNFT = await ethers.getContractFactory("ConnectedNFT");
  const connectedNft = ConnectedNFT.attach(connectedAddress);

  // Set universal contract
  console.log("Setting universal contract...");
  const tx = await connectedNft.setUniversal(universalAddress);
  await tx.wait();

  console.log("Configuration complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });