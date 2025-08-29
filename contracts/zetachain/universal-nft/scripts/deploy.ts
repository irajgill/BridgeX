import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy Universal NFT as upgradeable proxy
  const UniversalNFT = await ethers.getContractFactory("UniversalNFT");

  const gateway = process.env.ZETACHAIN_GATEWAY || "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";
  const uniswapRouter = process.env.UNISWAP_ROUTER || "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe";

  console.log("Deploying Universal NFT...");
  const universalNft = await upgrades.deployProxy(
    UniversalNFT,
    [
      "ZetaChain Universal NFT",
      "ZUNFT",
      gateway,
      uniswapRouter
    ],
    {
      initializer: "initialize",
      kind: "uups"
    }
  );

  await universalNft.deployed();
  console.log("Universal NFT deployed to:", universalNft.address);

  // Verify contract on testnet/mainnet
  if (process.env.NODE_ENV !== "localnet") {
    console.log("Waiting for block confirmations...");
    await universalNft.deployTransaction.wait(6);

    console.log("Verifying contract...");
    try {
      await hre.run("verify:verify", {
        address: universalNft.address,
        constructorArguments: [],
      });
      console.log("Contract verified successfully");
    } catch (error) {
      console.log("Verification failed:", error);
    }
  }

  console.log(`Contract deployed to: ${universalNft.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });