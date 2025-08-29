import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { UniversalNFT } from "../typechain-types";

describe("UniversalNFT", function () {
  let universalNft: UniversalNFT;
  let owner: any, addr1: any, addr2: any;
  let gateway: string;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    gateway = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0";

    const UniversalNFT = await ethers.getContractFactory("UniversalNFT");
    universalNft = await upgrades.deployProxy(
      UniversalNFT,
      ["Test Universal NFT", "TUNFT", gateway, ethers.constants.AddressZero],
      { initializer: "initialize" }
    ) as UniversalNFT;

    await universalNft.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await universalNft.name()).to.equal("Test Universal NFT");
      expect(await universalNft.symbol()).to.equal("TUNFT");
    });

    it("Should set the right owner", async function () {
      expect(await universalNft.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("Should mint NFT with correct token ID", async function () {
      const uri = "ipfs://QmTest123";

      await expect(universalNft.safeMint(addr1.address, uri))
        .to.emit(universalNft, "TokenMinted")
        .withArgs(1, addr1.address, uri);

      expect(await universalNft.ownerOf(1)).to.equal(addr1.address);
      expect(await universalNft.tokenURI(1)).to.equal(uri);
      expect(await universalNft.getCreator(1)).to.equal(owner.address);
    });

    it("Should increment token IDs correctly", async function () {
      await universalNft.safeMint(addr1.address, "uri1");
      await universalNft.safeMint(addr2.address, "uri2");

      expect(await universalNft.getCurrentTokenId()).to.equal(3);
    });
  });

  describe("Cross-Chain Operations", function () {
    beforeEach(async function () {
      await universalNft.safeMint(addr1.address, "ipfs://test");
    });

    it("Should set connected contract", async function () {
      const zrc20 = "0x1234567890123456789012345678901234567890";
      const connected = "0x9876543210987654321098765432109876543210";

      await universalNft.setConnected(zrc20, connected);
      expect(await universalNft.connectedContracts(zrc20)).to.equal(connected);
    });

    it("Should fail cross-chain transfer without connected contract", async function () {
      const destination = "0x1234567890123456789012345678901234567890";

      await expect(
        universalNft.connect(addr1).transferCrossChain(
          1,
          ethers.utils.toUtf8Bytes(addr2.address),
          destination,
          { value: ethers.utils.parseEther("0.01") }
        )
      ).to.be.revertedWith("UniversalNFT: unsupported destination");
    });
  });
});