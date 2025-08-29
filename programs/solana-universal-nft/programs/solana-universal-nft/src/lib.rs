use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("UnivNFTSoL111111111111111111111111111111111");

pub mod state;
pub mod errors;

use state::*;
use errors::*;

#[program]
pub mod solana_universal_nft {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        collection_name: String,
        collection_symbol: String,
        collection_uri: String,
        gateway_pda: Pubkey,
    ) -> Result<()> {
        let program_state = &mut ctx.accounts.program_state;
        program_state.authority = ctx.accounts.authority.key();
        program_state.collection_name = collection_name;
        program_state.collection_symbol = collection_symbol;
        program_state.collection_uri = collection_uri;
        program_state.gateway_pda = gateway_pda;
        program_state.next_token_id = 1;
        program_state.bump = ctx.bumps.program_state;
        
        msg!("Universal NFT program initialized");
        Ok(())
    }

    pub fn on_call(
        _ctx: Context<OnCall>,
        _amount: u64,
        _sender: [u8; 20],
        _data: Vec<u8>,
    ) -> Result<()> {
        msg!("Received cross-chain call from ZetaChain");
        // TODO: Implement mint_from_universal logic
        Ok(())
    }

    pub fn burn_to_universal(
        _ctx: Context<BurnToUniversal>,
        _universal_token_id: u64,
        _destination_chain: Vec<u8>,
        _receiver: Vec<u8>,
    ) -> Result<()> {
        msg!("Burning NFT to return to Universal chain");
        // TODO: Implement burn logic and emit event
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = ProgramState::SPACE,
        seeds = [b"program_state"],
        bump
    )]
    pub program_state: Account<'info, ProgramState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OnCall<'info> {
    #[account(
        mut,
        seeds = [b"program_state"],
        bump = program_state.bump
    )]
    pub program_state: Account<'info, ProgramState>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BurnToUniversal<'info> {
    #[account(
        mut,
        seeds = [b"program_state"],
        bump = program_state.bump
    )]
    pub program_state: Account<'info, ProgramState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}
