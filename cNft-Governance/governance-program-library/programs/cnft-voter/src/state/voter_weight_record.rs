use anchor_lang::prelude::*;
use solana_program::pubkey::PUBKEY_BYTES;

use crate::utils::constant::DISCRIMINATOR_SIZE;


/// Voter actions in the realm
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Copy)]
pub enum VoterWeightAction {
    CastVote, 
    CommentProposal,
    CreateGovernance,
    CreateProposal,
    SignOffProposal,
}

/// Native Account version of VoterWeightRecord account, add #[account] attribute to make it an anchor account instead of define discriminator itself.
/// https://github.com/solana-labs/solana-program-library/blob/6386f24253686fbfe4ee5f5a118e5fa02c7a0b5e/governance/addin-api/src/voter_weight.rs#L29
#[account]
#[derive(Debug, PartialEq)]
pub struct VoterWeightRecord {
    /// The Realm the VoterWeightRecord belongs to, and the governance information
    pub realm: Pubkey,
    pub governing_token_mint: Pubkey,
    pub governing_token_owner: Pubkey, // the voter or the governance_program_id??

    pub voter_weight: u64,
    pub voter_weight_expiry: Option<u64>,

    /// define which action the voter put his/her weight on
    /// Option<T> is used when a value could be something or nothing
    /// In Typescript, it is like T | undefined
    pub weight_action: Option<VoterWeightAction>,

    pub weight_action_target: Option<Pubkey>,

    pub reserved: [u8; 8],
}

impl VoterWeightRecord {
    pub fn get_space() -> usize {
        DISCRIMINATOR_SIZE + PUBKEY_BYTES * 4 + 8 * 2 + 1 * 3 + 1 + 8
        // discriminator + pubkey * 4 + u64 * 2 + action + Option * 3 + reserved
    }
}

impl Default for VoterWeightRecord {
    fn default() -> Self {
        Self {
            realm: Default::default(),
            governing_token_mint: Default::default(),
            governing_token_owner: Default::default(),
            voter_weight: Default::default(),
            voter_weight_expiry: Some(0),
            weight_action: Some(VoterWeightAction::CastVote),
            weight_action_target: Some(Default::default()),
            reserved: Default::default(),
        }
    }
}