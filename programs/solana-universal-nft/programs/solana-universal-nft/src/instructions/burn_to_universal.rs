use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Burn};

use crate::state::*;
use crate::errors::*;

pub fn handler(
    ctx: Context<BurnToUniversal>,
    universal_token_id: u64,
    destination_chain: Vec<u8>,
    receiver: Vec<u8>,
) -> Result<()> {
    msg!("Burning NFT to return to Universal chain");
    msg!("Universal Token ID: {}", universal_token_id);

    let nft_state = &ctx.accounts.nft_state;

    // Verify the token belongs to the signer
    require!(
        ctx.accounts.token_account.amount == 1,
        UniversalNFTError::TokenNotOwned
    );

    // Burn the NFT token
    let cpi_context = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        },
    );

    token::burn(cpi_context, 1)?;

    // Prepare payload for return to Universal chain
    let return_payload = BurnToUniversalPayload {
        universal_token_id,
        destination_chain,
        receiver,
        original_owner: nft_state.original_owner.clone(),
    };

    // Emit event that will be observed by ZetaChain validators
    emit!(BurnToUniversalEvent {
        universal_token_id,
        destination_chain,
        receiver,
        original_owner: nft_state.original_owner.clone(),
        uri: nft_state.uri.clone(),
        name: nft_state.name.clone(),
        creator: nft_state.creator.clone(),
    });

    msg!("Successfully burned NFT with universal ID: {}", universal_token_id);

    Ok(())
}

#[event]
pub struct BurnToUniversalEvent {
    pub universal_token_id: u64,
    pub destination_chain: Vec<u8>,
    pub receiver: Vec<u8>,
    pub original_owner: Vec<u8>,
    pub uri: String,
    pub name: String,
    pub creator: Vec<u8>,
}