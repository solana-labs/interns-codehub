use gpl_cnft_voter::error::CompressedNftVoterError;
use program_test::{
    cnft_voter_test::CompressedNftVoterTest,
    tools::{assert_anchor_err, assert_cnft_voter_err},
};

use solana_program_test::*;
use solana_sdk::{signature::Keypair, signer::Signer, transport::TransportError};

use crate::program_test::cnft_voter_test::ConfigureCollectionArgs;

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

#[tokio::test]
async fn test_configure_multiple_collections() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let cnft_collection_cookie1 = cnft_voter_test.token_metadata.with_nft_collection().await?;
    let cnft_collection_cookie2 = cnft_voter_test.token_metadata.with_nft_collection().await?;

    let max_voter_weight_record_cookie = cnft_voter_test.with_max_voter_weight_record(&registrar_cookie).await?;

    cnft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie1,
        &max_voter_weight_record_cookie,
        Some(ConfigureCollectionArgs{weight:1, size: 8})
    ).await?;

    cnft_voter_test.with_collection(
        &registrar_cookie, 
        &cnft_collection_cookie2,
        &max_voter_weight_record_cookie,
        Some(ConfigureCollectionArgs{weight:2, size: 10})
    ).await?;

    let registrar = cnft_voter_test.get_registrar_account(&registrar_cookie.address).await;
    assert_eq!(registrar.collection_configs.len(), 2);

    let max_voter_weight_record = cnft_voter_test.get_max_voter_weight_record(&max_voter_weight_record_cookie.address).await;
    assert_eq!(max_voter_weight_record.max_voter_weight_expiry, None);
    assert_eq!(max_voter_weight_record.max_voter_weight, 28);
    Ok(())
}

#[tokio::test]
async fn test_configure_max_collections() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test.with_max_voter_weight_record(&registrar_cookie).await?;

    for _ in 0..registrar_cookie.max_collections {
        let cnft_collection_cookit = cnft_voter_test.token_metadata.with_nft_collection().await?;
        cnft_voter_test.with_collection(
            &registrar_cookie,
            &cnft_collection_cookit,
            &max_voter_weight_record_cookie,
            None,
        ).await?;
    }

    let registrar = cnft_voter_test.get_registrar_account(&registrar_cookie.address).await;
    assert_eq!(registrar.collection_configs.len(), registrar_cookie.max_collections as usize);

    let max_voter_weight_record = cnft_voter_test.get_max_voter_weight_record(&max_voter_weight_record_cookie.address).await;
    assert_eq!(max_voter_weight_record.max_voter_weight_expiry, None);
    assert_eq!(max_voter_weight_record.max_voter_weight, 30);

    Ok(())
}

#[tokio::test]
async fn test_configure_colelction_with_invalid_error() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let cnft_collection_cookie = cnft_voter_test.token_metadata.with_nft_collection().await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let realm_cookie2 = cnft_voter_test.governance.with_realm().await?;

    let err = cnft_voter_test
        .with_collection_using_ix(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            None,
            |i| i.accounts[1].pubkey = realm_cookie2.address, // realm
            None,
        )
        .await
        .err()
        .unwrap();


    assert_cnft_voter_err(err, CompressedNftVoterError::InvalidRealmForRegistrar);
    Ok(())
}

#[tokio::test]
async fn test_configure_collection_with_realm_authority_must_sign_error(
) -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let cnft_collection_cookie = cnft_voter_test.token_metadata.with_nft_collection().await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;

    let err = cnft_voter_test
        .with_collection_using_ix(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            None,
            |i| i.accounts[2].is_signer = false, // why realm_authority is the signer
            Some(&[]),
        )
        .await
        .err()
        .unwrap();

    assert_anchor_err(err, anchor_lang::error::ErrorCode::AccountNotSigner);
    Ok(())
}

#[tokio::test]
async fn test_configure_collection_with_invalid_realm_authority_error() -> Result<(), TransportError>
{
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let cnft_collection_cookie = cnft_voter_test.token_metadata.with_nft_collection().await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;

    let realm_authority = Keypair::new();

    let err = cnft_voter_test
        .with_collection_using_ix(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            None,
            |i| i.accounts[2].pubkey = realm_authority.pubkey(), // realm_authority
            Some(&[&realm_authority]),
        )
        .await
        .err()
        .unwrap();

    assert_cnft_voter_err(err, CompressedNftVoterError::InvalidRealmAuthority);

    Ok(())
}

#[tokio::test]
async fn test_configure_collection_with_invalid_max_voter_weight_mint_error(
) -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let mut realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let cnft_collection_cookie = cnft_voter_test.token_metadata.with_nft_collection().await?;

    realm_cookie.account.community_mint = realm_cookie.account.config.council_mint.unwrap();
    let registrar_cookie2 = cnft_voter_test.with_registrar(&realm_cookie).await?;

    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie2)
        .await?;

    let err = cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            None,
        )
        .await
        .err()
        .unwrap();

    assert_cnft_voter_err(err, CompressedNftVoterError::InvalidMaxVoterWeightRecordMint);
    Ok(())
}
