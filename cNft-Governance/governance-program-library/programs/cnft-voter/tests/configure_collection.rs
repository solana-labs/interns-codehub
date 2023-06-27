use gpl_cnft_voter::error::CompressedNftVoterError;
use program_test::{
    cnft_voter_test::CompressedNftVoterTest,
    tools::{assert_anchor_err, assert_cnft_voter_err},
};

use solana_program_test::*;
use solana_sdk::{signature::Keypair, signer::Signer, transport::TransportError};

use crate::program_test::nft_voter_test::ConfigureCollectionArgs;

mod program_test;

#[tokio::test]
async fn test_configure_collection() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;

    let realm_cookie = cnft_voter_test.governance.with_realm().await?;

    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;

    let cnft_collection_cookie = cnft_voter_test.token_metadata.with_nft_collection().await?;

    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;

    let collection_config_cookie = cnft_voter_test.with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            None
        ).await?;
    
    let registrar = cnft_voter_test.get_registrar_account(&registrar_cookie.address).await;

    assert_eq!(registrar.collection_configs.len(), 1);

    assert_eq!(registrar.collection_configs[0], collection_config_cookie.collection_config);

    let max_voter_weight_record = cnft_voter_test.get_max_voter_weight_record(&max_voter_weight_record_cookie.address).await;

    assert_eq!(max_voter_weight_record.max_voter_weight_expiry, None);
    assert_eq!(max_voter_weight_record.max_voter_weight, (registrar.collection_configs[0].weight as u32 * registrar.collection_configs[0].size) as u64);

    Ok(())
}

