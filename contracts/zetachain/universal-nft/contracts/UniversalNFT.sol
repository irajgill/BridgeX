// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@zetachain/standard-contracts/contracts/nft/contracts/zetachain/UniversalNFTCore.sol";
import "@zetachain/standard-contracts/contracts/nft/contracts/zetachain/UniversalNFTUpgradeable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title UniversalNFT
 * @dev Universal NFT contract deployed on ZetaChain that enables cross-chain NFT transfers
 * This contract serves as the hub for all cross-chain NFT operations
 */
contract UniversalNFT is UniversalNFTUpgradeable, ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;

    // Global token ID counter for persistent universal IDs
    Counters.Counter private _tokenIdCounter;

    // Mapping of universal token ID to metadata URI
    mapping(uint256 => string) private _tokenURIs;

    // Mapping of universal token ID to creator address
    mapping(uint256 => address) private _creators;

    // Mapping of chain ZRC-20 address to connected contract address
    mapping(address => address) public connectedContracts;

    // Events for cross-chain operations
    event TokenMinted(uint256 indexed tokenId, address indexed to, string uri);
    event CrossChainTransferInitiated(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        address destination,
        bytes message
    );
    event TokenBurnedForTransfer(uint256 indexed tokenId, address indexed from);
    event TokenMintedFromTransfer(
        uint256 indexed tokenId,
        address indexed to,
        string uri,
        address sourceChain
    );

    /**
     * @dev Initialize the Universal NFT contract
     * @param name The name of the NFT collection
     * @param symbol The symbol of the NFT collection
     * @param gateway The ZetaChain gateway address
     * @param uniswapRouter The Uniswap router address for gas calculations
     */
    function initialize(
        string memory name,
        string memory symbol,
        address gateway,
        address uniswapRouter
    ) public initializer {
        __UniversalNFT_init(name, symbol, gateway, uniswapRouter);
        __Ownable_init();
        _tokenIdCounter.increment(); // Start token IDs at 1
    }

    /**
     * @dev Mint a new Universal NFT
     * @param to The recipient address
     * @param uri The metadata URI for the token
     * @return tokenId The newly minted token ID
     */
    function safeMint(
        address to,
        string memory uri
    ) public nonReentrant returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _creators[tokenId] = msg.sender;

        emit TokenMinted(tokenId, to, uri);
        return tokenId;
    }

    /**
     * @dev Transfer NFT to another chain
     * @param tokenId The token ID to transfer
     * @param receiver The receiver address on the destination chain
     * @param destination The ZRC-20 address of the destination chain's gas token
     */
    function transferCrossChain(
        uint256 tokenId,
        bytes memory receiver,
        address destination
    ) external payable nonReentrant {
        require(_exists(tokenId), "UniversalNFT: token does not exist");
        require(ownerOf(tokenId) == msg.sender, "UniversalNFT: not token owner");
        require(connectedContracts[destination] != address(0), "UniversalNFT: unsupported destination");

        string memory uri = tokenURI(tokenId);
        address creator = _creators[tokenId];

        // Burn token on source chain
        _burn(tokenId);
        emit TokenBurnedForTransfer(tokenId, msg.sender);

        // Prepare cross-chain message
        bytes memory message = abi.encode(
            tokenId,
            receiver,
            uri,
            creator,
            msg.sender // original owner for revert purposes
        );

        // Check if destination is Solana (special handling)
        if (_isSolanaDestination(destination)) {
            _transferToSolana(tokenId, receiver, message, destination);
        } else {
            // EVM chain transfer
            _transferToEVM(tokenId, receiver, message, destination);
        }

        emit CrossChainTransferInitiated(tokenId, msg.sender, address(0), destination, message);
    }

    /**
     * @dev Handle incoming transfers from connected chains
     * @param context Cross-chain message context
     * @param zrc20 ZRC-20 token address (chain identifier)
     * @param amount Token amount (unused for NFTs)
     * @param message Encoded transfer data
     */
    function onCall(
        MessageContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external override onlyGateway {
        // Decode the incoming message
        (
            uint256 tokenId,
            address receiver,
            string memory uri,
            address creator,
            address originalOwner
        ) = abi.decode(message, (uint256, address, string, address, address));

        // Mint the token to the receiver
        _safeMint(receiver, tokenId);
        _setTokenURI(tokenId, uri);
        _creators[tokenId] = creator;

        emit TokenMintedFromTransfer(tokenId, receiver, uri, context.sender);
    }

    /**
     * @dev Set connected contract for a specific chain
     * @param zrc20 ZRC-20 address of the chain's gas token
     * @param contractAddress Address of the connected contract on that chain
     */
    function setConnected(
        address zrc20,
        address contractAddress
    ) external onlyOwner {
        connectedContracts[zrc20] = contractAddress;
    }

    /**
     * @dev Handle revert scenario when cross-chain transfer fails
     * @param context Revert context
     * @param zrc20 ZRC-20 token address
     * @param amount Token amount
     * @param message Original transfer message
     */
    function onRevert(
        RevertContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external override onlyGateway {
        // Decode the original message to restore the token
        (
            uint256 tokenId,
            ,
            string memory uri,
            address creator,
            address originalOwner
        ) = abi.decode(message, (uint256, address, string, address, address));

        // Re-mint the token to the original owner
        _safeMint(originalOwner, tokenId);
        _setTokenURI(tokenId, uri);
        _creators[tokenId] = creator;
    }

    /**
     * @dev Transfer to Solana via withdrawAndCall
     */
    function _transferToSolana(
        uint256 tokenId,
        bytes memory receiver,
        bytes memory message,
        address destination
    ) internal {
        // Encode accounts for Solana program
        bytes memory accounts = _encodeSolanaAccounts(receiver, tokenId);

        // Combine accounts and data for Solana program call
        bytes memory solanaMessage = abi.encode(accounts, message);

        gateway.withdrawAndCall(
            abi.encodePacked(connectedContracts[destination]), // Solana program address
            0, // No token withdrawal needed
            destination,
            solanaMessage,
            CallOptions({gasLimit: 300000, isArbitraryCall: false}),
            RevertOptions({
                revertAddress: address(this),
                callOnRevert: true,
                abortAddress: address(this),
                revertMessage: message,
                onRevertGasLimit: 100000
            })
        );
    }

    /**
     * @dev Transfer to EVM chain
     */
    function _transferToEVM(
        uint256 tokenId,
        bytes memory receiver,
        bytes memory message,
        address destination
    ) internal {
        gateway.call(
            receiver,
            destination,
            message,
            CallOptions({gasLimit: 300000, isArbitraryCall: false}),
            RevertOptions({
                revertAddress: address(this),
                callOnRevert: true,
                abortAddress: address(this),
                revertMessage: message,
                onRevertGasLimit: 100000
            })
        );
    }

    /**
     * @dev Encode Solana accounts for program invocation
     */
    function _encodeSolanaAccounts(
        bytes memory receiver,
        uint256 tokenId
    ) internal view returns (bytes memory) {
        // Create account metadata array for Solana program
        // This includes program PDA, gateway PDA, system program, etc.
        AccountMeta[] memory accounts = new AccountMeta[](6);

        accounts[0] = AccountMeta({
            publicKey: receiver, // Program PDA derived from universal ID
            isWritable: true
        });

        accounts[1] = AccountMeta({
            publicKey: abi.encodePacked("gateway_pda_address"), // Gateway PDA
            isWritable: false
        });

        accounts[2] = AccountMeta({
            publicKey: abi.encodePacked("system_program"), // System program
            isWritable: false
        });

        accounts[3] = AccountMeta({
            publicKey: abi.encodePacked("token_program"), // Token program
            isWritable: false
        });

        accounts[4] = AccountMeta({
            publicKey: abi.encodePacked("metadata_program"), // Metaplex program
            isWritable: false
        });

        accounts[5] = AccountMeta({
            publicKey: abi.encodePacked("rent_sysvar"), // Rent sysvar
            isWritable: false
        });

        return abi.encode(accounts);
    }

    /**
     * @dev Check if destination is Solana
     */
    function _isSolanaDestination(address destination) internal pure returns (bool) {
        // This would be configured based on known Solana ZRC-20 addresses
        // For now, we use a placeholder check
        return destination == address(0x1234567890123456789012345678901234567890);
    }

    /**
     * @dev Set token URI (override from base)
     */
    function _setTokenURI(uint256 tokenId, string memory uri) internal {
        require(_exists(tokenId), "UniversalNFT: URI set of nonexistent token");
        _tokenURIs[tokenId] = uri;
    }

    /**
     * @dev Get token URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "UniversalNFT: URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    /**
     * @dev Get token creator
     */
    function getCreator(uint256 tokenId) public view returns (address) {
        require(_exists(tokenId), "UniversalNFT: creator query for nonexistent token");
        return _creators[tokenId];
    }

    /**
     * @dev Get current token ID counter
     */
    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    struct AccountMeta {
        bytes publicKey;
        bool isWritable;
    }
}