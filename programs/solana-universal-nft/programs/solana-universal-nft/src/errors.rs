use anchor_lang::prelude::*;

#[error_code]
pub enum UniversalNFTError {
    #[msg("Unauthorized gateway caller")]
    UnauthorizedGateway,

    #[msg("Invalid instruction data")]
    InvalidInstructionData,

    #[msg("Invalid payload format")]
    InvalidPayload,

    #[msg("Token not owned by signer")]
    TokenNotOwned,

    #[msg("NFT state not found")]
    NFTStateNotFound,

    #[msg("Invalid metadata account")]
    InvalidMetadataAccount,

    #[msg("Unauthorized update authority")]
    UnauthorizedUpdateAuthority,
}