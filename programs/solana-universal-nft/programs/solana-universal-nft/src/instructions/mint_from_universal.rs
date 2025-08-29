use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use anchor_spl::metadata::{
    create_metadata_accounts_v3,
    mpl_token_metadata::types::{Creator, DataV2, CollectionDetails},
    CreateMetadataAccountsV3, Metadata as MetaplexMetadata
};
use anchor_spl::associated_token::AssociatedToken;

use crate::state::*;
use crate::errors::*;

pub fn handler(ctx: Context<OnCall>, payload: Vec<u8>) -> Result<()> {
    let mint_payload: MintFromUniversalPayload = MintFromUniversalPayload::try_from_slice(&payload)
        .map_err(|_| UniversalNFTError::InvalidPayload)?;

    msg!("Minting NFT from Universal chain");
    msg!("Universal Token ID: {}", mint_payload.universal_token_id);
    msg!("Recipient: {}", mint_payload.recipient);

    // Create mint account for the NFT
    let mint_seeds = &[
        b"nft_mint",
        mint_payload.universal_token_id.to_le_bytes().as_ref(),
        &[ctx.bumps.get("mint").unwrap()],
    ];

    // Initialize mint account
    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::InitializeMint {
            mint: ctx.accounts.mint.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        },
        &[mint_seeds],
    );

    token::initialize_mint(cpi_context, 0, ctx.accounts.program_state.key(), None)?;

    // Create associated token account for recipient
    let cpi_context = CpiContext::new(
        ctx.accounts.associated_token_program.to_account_info(),
        anchor_spl::associated_token::Create {
            payer: ctx.accounts.authority.to_account_info(),
            associated_token: ctx.accounts.token_account.to_account_info(),
            authority: mint_payload.recipient.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        },
    );

    anchor_spl::associated_token::create(cpi_context)?;

    // Mint 1 NFT to the recipient
    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.program_state.to_account_info(),
        },
        &[&[
            b"program_state",
            &[ctx.accounts.program_state.bump],
        ]],
    );

    token::mint_to(cpi_context, 1)?;

    // Create metadata account
    let creators = vec![Creator {
        address: ctx.accounts.program_state.key(),
        verified: true,
        share: 100,
    }];

    let metadata = DataV2 {
        name: mint_payload.name.clone(),
        symbol: mint_payload.symbol.clone(),
        uri: mint_payload.uri.clone(),
        seller_fee_basis_points: mint_payload.royalty_bps,
        creators: Some(creators),
        collection: None,
        uses: None,
    };

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.metadata_program.to_account_info(),
        CreateMetadataAccountsV3 {
            metadata: ctx.accounts.metadata.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            mint_authority: ctx.accounts.program_state.to_account_info(),
            update_authority: ctx.accounts.program_state.to_account_info(),
            payer: ctx.accounts.authority.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        },
        &[&[
            b"program_state",
            &[ctx.accounts.program_state.bump],
        ]],
    );

    create_metadata_accounts_v3(cpi_context, metadata, false, true, None)?;

    // Create NFT state account
    let nft_state = &mut ctx.accounts.nft_state;
    nft_state.universal_token_id = mint_payload.universal_token_id;
    nft_state.mint = ctx.accounts.mint.key();
    nft_state.original_owner = mint_payload.creator.clone();
    nft_state.current_owner = mint_payload.recipient;
    nft_state.uri = mint_payload.uri;
    nft_state.creator = mint_payload.creator;
    nft_state.name = mint_payload.name;
    nft_state.symbol = mint_payload.symbol;
    nft_state.royalty_bps = mint_payload.royalty_bps;
    nft_state.bump = ctx.bumps.nft_state;

    msg!("Successfully minted NFT with universal ID: {}", mint_payload.universal_token_id);

    Ok(())
}

#[derive(Accounts)]
#[instruction(payload: Vec<u8>)]
pub struct MintFromUniversal<'info> {
    #[account(
        mut,
        seeds = [b"program_state"],
        bump = program_state.bump
    )]
    pub program_state: Account<'info, ProgramState>,

    #[account(
        init,
        payer = authority,
        space = NFTState::SPACE,
        seeds = [b"nft_state", universal_token_id.to_le_bytes().as_ref()],
        bump
    )]
    pub nft_state: Account<'info, NFTState>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = program_state.key(),
        seeds = [b"nft_mint", universal_token_id.to_le_bytes().as_ref()],
        bump
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = recipient,
    )]
    pub token_account: Account<'info, TokenAccount>,

    /// CHECK: Metadata account to be created
    #[account(mut)]
    pub metadata: AccountInfo<'info>,

    /// CHECK: Recipient derived from payload
    pub recipient: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub metadata_program: Program<'info, MetaplexMetadata>,
    pub rent: Sysvar<'info, Rent>,
}