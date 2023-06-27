use anchor_lang::prelude::*;
use gpl_cnft_voter::error::CompressedNftVoterError;

use program_test::cnft_voter_test::CompressedNftVoterTest;
use program_test::tools::{assert_anchor_err, assert_cnft_voter_err};

use solana_program_test::*;
use solana_sdk::{signature::Keypair, signer::Signer, transport::TransportError};

use crate::program_test::cnft_voter_test::ConfigureCollectionArgs;
mod program_test;

// #[tokio::test]
// async fn test_configure_collection() -> Result<(), TransportError> {
//     let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;

//     let mut realm_cookie = cnft_voter_test.governance.with_realm().await?;
//     realm_cookie.realm_authority = Keypair::new();

//     let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;

//     let cnft_collection_cookie = cnft_voter_test.token_metadata.with_nft_collection().await?;

//     let max_voter_weight_record_cookie = cnft_voter_test
//         .with_max_voter_weight_record(&registrar_cookie)
//         .await?;

//     let collection_config_cookie = cnft_voter_test.with_collection(
//             &registrar_cookie,
//             &cnft_collection_cookie,
//             &max_voter_weight_record_cookie,
//             None
//         ).await?;
    
// }