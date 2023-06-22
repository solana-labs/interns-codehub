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
}