use anchor_lang::prelude::*;

#[account]
pub struct ProgramState {
    /// Program authority
    pub authority: Pubkey,
    /// Collection name
    pub collection_name: String,
    /// Collection symbol
    pub collection_symbol: String,
    /// Collection metadata URI
    pub collection_uri: String,
    /// ZetaChain Gateway PDA address
    pub gateway_pda: Pubkey,
    /// Next token ID counter
    pub next_token_id: u64,
    /// PDA bump
    pub bump: u8,
}

impl ProgramState {
    pub const SPACE: usize = 8 + // discriminator
        32 + // authority
        4 + 16 + // collection_name (max 16 chars)
        4 + 8 + // collection_symbol (max 8 chars)
        4 + 64 + // collection_uri (max 64 chars)
        32 + // gateway_pda
        8 + // next_token_id
        1; // bump
}

#[account]
pub struct NFTState {
    /// Universal token ID from ZetaChain
    pub universal_token_id: u64,
    /// Mint address of the Solana NFT
    pub mint: Pubkey,
    /// Original owner on ZetaChain/EVM
    pub original_owner: Vec<u8>,
    /// Current owner on Solana
    pub current_owner: Pubkey,
    /// Metadata URI
    pub uri: String,
    /// Creator address from original chain
    pub creator: Vec<u8>,
    /// Token name
    pub name: String,
    /// Token symbol
    pub symbol: String,
    /// Royalty percentage (basis points)
    pub royalty_bps: u16,
    /// PDA bump
    pub bump: u8,
}

impl NFTState {
    pub const SPACE: usize = 8 + // discriminator
        8 + // universal_token_id
        32 + // mint
        4 + 32 + // original_owner (EVM address)
        32 + // current_owner
        4 + 512 + // uri (max 512 chars)
        4 + 32 + // creator (EVM address)
        4 + 64 + // name (max 64 chars)
        4 + 16 + // symbol (max 16 chars)
        2 + // royalty_bps
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct CrossChainInstruction {
    pub instruction_type: CrossChainInstructionType,
    pub payload: Vec<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub enum CrossChainInstructionType {
    MintFromUniversal,
    UpdateMetadata,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MintFromUniversalPayload {
    pub universal_token_id: u64,
    pub recipient: Pubkey,
    pub uri: String,
    pub name: String,
    pub symbol: String,
    pub creator: Vec<u8>, // Original creator address
    pub royalty_bps: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct UpdateMetadataPayload {
    pub universal_token_id: u64,
    pub new_uri: String,
    pub new_name: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct BurnToUniversalPayload {
    pub universal_token_id: u64,
    pub destination_chain: Vec<u8>,
    pub receiver: Vec<u8>,
    pub original_owner: Vec<u8>,
}