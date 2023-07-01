use anchor_lang::prelude::*;

#[error_code]
pub enum CompressedNftVoterError {
    #[msg("Invalid instruction")]
    InvalidInstruction,

    #[msg("Collection not fount")]
    CollectionNotFound,

    #[msg("Invalid Realm Authoritu")]
    InvalidRealmAuthority,

    #[msg("Invalid Token Owner For Voter Weight Record")]
    InvalidTokenOwnerForVoterWeightRecord,

    #[msg("Voter Doest Not Own NFT")]
    VoterDoesNotOwnNft,

    #[msg("Duplicated NFT Detected")]
    DuplicatedNftDetected,

    #[msg("Invalid NFT Amount")]
    InvalidNftAmount,

    #[msg("Invalid Account Owner")]
    InvalidAccountOwner,

    #[msg("Token Metadata Does Not Match")]
    TokenMetadataDoesNotMatch,

    #[msg("Missing Metadata Collection")]
    MissingMetadataCollection,

    #[msg("Collection Must Be Verified")]
    CollectionMustBeVerified,

    #[msg("Invalid Voter Weight Record Realm")]
    InvalidVoterWeightRecordRealm,

    #[msg("Invalid Voter Weight Record Realm")]
    InvalidVoterWeightRecordMint,

    #[msg("Cast Vote Is Not Allowed")]
    CastVoteIsNotAllowed,

    #[msg("Invalid Vote Record Account")]
    InvalidVoteRecordAccount,

    #[msg("Vote Record Must Be Withdrawn")]
    VoteRecordMustBeWithdrawn,

    #[msg("Voter Weight Record Must Be Expired")]
    VoterWeightRecordMustBeExpired,

    #[msg("Invalid Proposal For NFT Vote Record")]
    InvalidProposalForNftVoteRecord,

    #[msg("Invalid Token Owner For NFT Vote Record")]
    InvalidTokenOwnerForNftVoteRecord,

    #[msg("Invalid Realm For Registrar")]
    InvalidRealmForRegistrar,

    #[msg("Invalid Max Voter Weight Record Realm")]
    InvalidMaxVoterWeightRecordRealm,

    #[msg("Invalid Max Voter Weight Record Mint")]
    InvalidMaxVoterWeightRecordMint,

    #[msg("Invalid Collection Size")]
    InvalidCollectionSize,

    #[msg("NFT Already Voted")]
    NftAlreadyVoted,

    #[msg("Leaf Owner Must Be Payer")]
    LeafOwnerMustBePayer,

    #[msg("Leaf Owner Must Be Token Owner")]
    LeafOwnerMustBeTokenOwner,

    #[msg("Invalid Metadata")]
    InvalidMetadata,

    #[msg("Invalid AssetId")]
    InvalidAssetId,
}

#[error_code]
pub enum NftVoterError {
    #[msg("Invalid Realm Authority")]
    InvalidRealmAuthority,

    #[msg("Invalid Realm for Registrar")]
    InvalidRealmForRegistrar,

    #[msg("Invalid Collection Size")]
    InvalidCollectionSize,

    #[msg("Invalid MaxVoterWeightRecord Realm")]
    InvalidMaxVoterWeightRecordRealm,

    #[msg("Invalid MaxVoterWeightRecord Mint")]
    InvalidMaxVoterWeightRecordMint,

    #[msg("CastVote Is Not Allowed")]
    CastVoteIsNotAllowed,

    #[msg("Invalid VoterWeightRecord Realm")]
    InvalidVoterWeightRecordRealm,

    #[msg("Invalid VoterWeightRecord Mint")]
    InvalidVoterWeightRecordMint,

    #[msg("Invalid TokenOwner for VoterWeightRecord")]
    InvalidTokenOwnerForVoterWeightRecord,

    #[msg("Collection must be verified")]
    CollectionMustBeVerified,

    #[msg("Voter does not own NFT")]
    VoterDoesNotOwnNft,

    #[msg("Collection not found")]
    CollectionNotFound,

    #[msg("Missing Metadata collection")]
    MissingMetadataCollection,

    #[msg("Token Metadata doesn't match")]
    TokenMetadataDoesNotMatch,

    #[msg("Invalid account owner")]
    InvalidAccountOwner,

    #[msg("Invalid token metadata account")]
    InvalidTokenMetadataAccount,

    #[msg("Duplicated NFT detected")]
    DuplicatedNftDetected,

    #[msg("Invalid NFT amount")]
    InvalidNftAmount,

    #[msg("NFT already voted")]
    NftAlreadyVoted,

    #[msg("Invalid Proposal for NftVoteRecord")]
    InvalidProposalForNftVoteRecord,

    #[msg("Invalid TokenOwner for NftVoteRecord")]
    InvalidTokenOwnerForNftVoteRecord,

    #[msg("VoteRecord must be withdrawn")]
    VoteRecordMustBeWithdrawn,

    #[msg("Invalid VoteRecord for NftVoteRecord")]
    InvalidVoteRecordForNftVoteRecord,

    #[msg("VoterWeightRecord must be expired")]
    VoterWeightRecordMustBeExpired,

    #[msg("Root must be equal")]
    RootMustBeEqual,
}
