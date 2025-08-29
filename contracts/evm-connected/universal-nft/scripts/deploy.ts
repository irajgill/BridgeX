import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy Connected NFT as upgradeable proxy
  const ConnectedNFT = await ethers.getContractFactory("ConnectedNFT");

  const gateway = process.env.EVM_GATEWAY || "0x0c487a766110c85d301d96e33579c5b317fa4995";

  console.log("Deploying Connected NFT...");
  const connectedNft = await upgrades.deployProxy(
    ConnectedNFT,
    [
      "EVM Universal NFT",
      "EUNFT",
      gateway
    ],
    {
      initializer: "initialize",
      kind: "uups"
    }
  );

  await connectedNft.deployed();
  console.log("Connected NFT deployed to:", connectedNft.address);

  // Verify contract on testnet/mainnet
  if (process.env.NODE_ENV !== "localnet") {
    console.log("Waiting for block confirmations...");
    await connectedNft.deployTransaction.wait(6);

    console.log("Verifying contract...");
    try {
      await hre.run("verify:verify", {
        address: connectedNft.address,
        constructorArguments: [],
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.log("Verification failed:", error);
    }
  }

  console.log(`Contract deployed to: ${connectedNft.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });