use anchor_lang::prelude::*;
use anchor_spl::metadata::{
    update_metadata_accounts_v2, mpl_token_metadata::types::DataV2,
    UpdateMetadataAccountsV2, Metadata as MetaplexMetadata
};

use crate::state::*;
use crate::errors::*;

pub fn handler(ctx: Context<OnCall>, payload: Vec<u8>) -> Result<()> {
    let update_payload: UpdateMetadataPayload = UpdateMetadataPayload::try_from_slice(&payload)
        .map_err(|_| UniversalNFTError::InvalidPayload)?;

    msg!("Updating metadata for Universal NFT ID: {}", update_payload.universal_token_id);

    // Update the NFT state
    let nft_state = &mut ctx.accounts.nft_state;
    nft_state.uri = update_payload.new_uri.clone();
    nft_state.name = update_payload.new_name.clone();

    Ok(())
}

pub fn update_metadata_handler(
    ctx: Context<UpdateMetadataFromUniversal>,
    universal_token_id: u64,
    new_uri: String,
    new_name: String,
) -> Result<()> {
    msg!("Updating metadata for NFT ID: {}", universal_token_id);

    let nft_state = &mut ctx.accounts.nft_state;

    // Verify gateway authorization
    require!(
        ctx.accounts.gateway_pda.key() == ctx.accounts.program_state.gateway_pda,
        UniversalNFTError::UnauthorizedGateway
    );

    // Update NFT state
    nft_state.uri = new_uri.clone();
    nft_state.name = new_name.clone();

    // Create updated metadata
    let new_metadata = DataV2 {
        name: new_name,
        symbol: nft_state.symbol.clone(),
        uri: new_uri,
        seller_fee_basis_points: nft_state.royalty_bps,
        creators: None, // Keep existing creators
        collection: None,
        uses: None,
    };

    // Update on-chain metadata
    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.metadata_program.to_account_info(),
        UpdateMetadataAccountsV2 {
            metadata: ctx.accounts.metadata.to_account_info(),
            update_authority: ctx.accounts.program_state.to_account_info(),
        },
        &[&[
            b"program_state",
            &[ctx.accounts.program_state.bump],
        ]],
    );

    update_metadata_accounts_v2(cpi_context, None, Some(new_metadata), None, None)?;

    msg!("Successfully updated metadata for NFT ID: {}", universal_token_id);

    Ok(())
}