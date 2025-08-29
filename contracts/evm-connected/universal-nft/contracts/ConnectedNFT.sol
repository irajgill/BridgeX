// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@zetachain/standard-contracts/contracts/nft/contracts/evm/ConnectedNFTCore.sol";
import "@zetachain/standard-contracts/contracts/nft/contracts/evm/ConnectedNFTUpgradeable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ConnectedNFT
 * @dev Connected NFT contract deployed on EVM chains, paired with Universal contract on ZetaChain
 */
contract ConnectedNFT is ConnectedNFTUpgradeable, ReentrancyGuard, Ownable {

    // Address of the Universal contract on ZetaChain
    address public universalContract;

    // Mapping of universal token ID to metadata URI
    mapping(uint256 => string) private _tokenURIs;

    // Mapping of universal token ID to creator address
    mapping(uint256 => address) private _creators;

    // Events
    event TokenMintedFromUniversal(uint256 indexed tokenId, address indexed to, string uri);
    event TokenBurnedForTransfer(uint256 indexed tokenId, address indexed from, address indexed destination);
    event CrossChainTransferInitiated(uint256 indexed tokenId, address indexed from, bytes receiver, address destination);

    /**
     * @dev Initialize the Connected NFT contract
     * @param name The name of the NFT collection
     * @param symbol The symbol of the NFT collection  
     * @param gateway The gateway contract address on this chain
     */
    function initialize(
        string memory name,
        string memory symbol,
        address gateway
    ) public initializer {
        __ConnectedNFT_init(name, symbol, gateway);
        __Ownable_init();
    }

    /**
     * @dev Mint NFT on connected chain (creates new universal ID)
     * @param to The recipient address
     * @param uri The metadata URI for the token
     * @return tokenId The newly minted token ID
     */
    function safeMint(
        address to,
        string memory uri
    ) public nonReentrant returns (uint256) {
        require(universalContract != address(0), "ConnectedNFT: universal contract not set");

        // Generate a pseudo-random token ID for connected chain minting
        uint256 tokenId = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender, to)));

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _creators[tokenId] = msg.sender;

        emit TokenMintedFromUniversal(tokenId, to, uri);
        return tokenId;
    }

    /**
     * @dev Transfer NFT to another chain via ZetaChain
     * @param tokenId The token ID to transfer
     * @param receiver The receiver address on the destination chain
     * @param destination ZRC-20 address of destination chain (0x0 for ZetaChain)
     */
    function transferCrossChain(
        uint256 tokenId,
        bytes memory receiver,
        address destination
    ) external payable nonReentrant {
        require(_exists(tokenId), "ConnectedNFT: token does not exist");
        require(ownerOf(tokenId) == msg.sender, "ConnectedNFT: not token owner");
        require(universalContract != address(0), "ConnectedNFT: universal contract not set");

        string memory uri = tokenURI(tokenId);
        address creator = _creators[tokenId];

        // Burn token on source chain
        _burn(tokenId);
        emit TokenBurnedForTransfer(tokenId, msg.sender, destination);

        // Prepare message for Universal contract
        bytes memory message = abi.encode(
            tokenId,
            receiver,
            uri,
            creator,
            msg.sender,
            destination
        );

        // Send to ZetaChain Universal contract
        gateway.call(
            abi.encodePacked(universalContract),
            message,
            RevertOptions({
                revertAddress: address(this),
                callOnRevert: true,
                abortAddress: address(this),
                revertMessage: abi.encode(tokenId, msg.sender, uri, creator),
                onRevertGasLimit: 100000
            })
        );

        emit CrossChainTransferInitiated(tokenId, msg.sender, receiver, destination);
    }

    /**
     * @dev Handle incoming transfers from ZetaChain Universal contract
     * @param sender Address of the sender (Universal contract)
     * @param message Encoded transfer data
     */
    function onCall(
        MessageContext calldata context,
        bytes calldata message
    ) external override onlyGateway {
        require(context.sender == universalContract, "ConnectedNFT: unauthorized sender");

        // Decode the incoming message
        (
            uint256 tokenId,
            address receiver,
            string memory uri,
            address creator
        ) = abi.decode(message, (uint256, address, string, address));

        // Mint the token to the receiver
        _safeMint(receiver, tokenId);
        _setTokenURI(tokenId, uri);
        _creators[tokenId] = creator;

        emit TokenMintedFromUniversal(tokenId, receiver, uri);
    }

    /**
     * @dev Handle revert scenario when cross-chain transfer fails
     * @param context Revert context
     * @param message Original transfer message
     */
    function onRevert(
        RevertContext calldata context,
        bytes calldata message
    ) external override onlyGateway {
        // Decode the original message to restore the token
        (
            uint256 tokenId,
            address originalOwner,
            string memory uri,
            address creator
        ) = abi.decode(message, (uint256, address, string, address));

        // Re-mint the token to the original owner
        _safeMint(originalOwner, tokenId);
        _setTokenURI(tokenId, uri);
        _creators[tokenId] = creator;
    }

    /**
     * @dev Set the Universal contract address on ZetaChain
     * @param _universalContract Address of the Universal contract
     */
    function setUniversal(address _universalContract) external onlyOwner {
        universalContract = _universalContract;
    }

    /**
     * @dev Set token URI
     */
    function _setTokenURI(uint256 tokenId, string memory uri) internal {
        require(_exists(tokenId), "ConnectedNFT: URI set of nonexistent token");
        _tokenURIs[tokenId] = uri;
    }

    /**
     * @dev Get token URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ConnectedNFT: URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    /**
     * @dev Get token creator
     */
    function getCreator(uint256 tokenId) public view returns (address) {
        require(_exists(tokenId), "ConnectedNFT: creator query for nonexistent token");
        return _creators[tokenId];
    }
}