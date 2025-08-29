import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { ConnectedNFT } from "../typechain-types";

describe("ConnectedNFT", function () {
  let connectedNft: ConnectedNFT;
  let owner: any, addr1: any, addr2: any;
  let gateway: string;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    gateway = "0x0c487a766110c85d301d96e33579c5b317fa4995";

    const ConnectedNFT = await ethers.getContractFactory("ConnectedNFT");
    connectedNft = await upgrades.deployProxy(
      ConnectedNFT,
      ["Test Connected NFT", "TCNFT", gateway],
      { initializer: "initialize" }
    ) as ConnectedNFT;

    await connectedNft.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await connectedNft.name()).to.equal("Test Connected NFT");
      expect(await connectedNft.symbol()).to.equal("TCNFT");
    });

    it("Should set the right owner", async function () {
      expect(await connectedNft.owner()).to.equal(owner.address);
    });
  });

  describe("Configuration", function () {
    it("Should set universal contract", async function () {
      const universalAddress = "0x1234567890123456789012345678901234567890";

      await connectedNft.setUniversal(universalAddress);
      expect(await connectedNft.universalContract()).to.equal(universalAddress);
    });

    it("Should fail to mint without universal contract", async function () {
      await expect(
        connectedNft.safeMint(addr1.address, "ipfs://test")
      ).to.be.revertedWith("ConnectedNFT: universal contract not set");
    });
  });

  describe("Minting with Universal Contract", function () {
    beforeEach(async function () {
      const universalAddress = "0x1234567890123456789012345678901234567890";
      await connectedNft.setUniversal(universalAddress);
    });

    it("Should mint NFT successfully", async function () {
      const uri = "ipfs://QmTest123";

      const tx = await connectedNft.safeMint(addr1.address, uri);
      const receipt = await tx.wait();

      // Get token ID from event
      const transferEvent = receipt.events?.find(e => e.event === "Transfer");
      const tokenId = transferEvent?.args?.tokenId;

      expect(await connectedNft.ownerOf(tokenId)).to.equal(addr1.address);
      expect(await connectedNft.tokenURI(tokenId)).to.equal(uri);
    });
  });
});