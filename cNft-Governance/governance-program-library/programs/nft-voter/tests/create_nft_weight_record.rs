use crate::program_test::{ tools::assert_nft_voter_err, token_metadata_test::CreateNftArgs };
use gpl_nft_voter::error::NftVoterError;
use program_test::nft_voter_test::*;
use solana_program_test::*;
use solana_sdk::transport::TransportError;
mod program_test;

#[tokio::test]
async fn test_create_nft_weight_record() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let nft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &nft_collection_cookie,
        &max_voter_weight_record_cookie,
        Some(ConfigureCollectionArgs {
            weight: 3,
            size: 11,
        })
    ).await?;

    let voter_cookie = nft_voter_test.bench.with_wallet().await;
    let voter_weight_record_cookie = nft_voter_test.with_voter_weight_record(
        &registrar_cookie,
        &voter_cookie
    ).await?;

    let nft_cookie = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        None
    ).await?;

    let nft_weight_record_cookies = nft_voter_test.with_create_nft_weight_record(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&nft_cookie]
    ).await?;

    let nft_weight_record = &nft_weight_record_cookies[0].address;
    let nft_weight_record_info = nft_voter_test.get_nft_weight_record(&nft_weight_record).await;

    assert!(nft_weight_record_info.weight == 3);

    Ok(())
}

#[tokio::test]
async fn test_create_nft_weight_record_with_multiple_nfts() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let nft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &nft_collection_cookie,
        &max_voter_weight_record_cookie,
        Some(ConfigureCollectionArgs {
            weight: 3,
            size: 11,
        })
    ).await?;

    let voter_cookie = nft_voter_test.bench.with_wallet().await;
    let voter_weight_record_cookie = nft_voter_test.with_voter_weight_record(
        &registrar_cookie,
        &voter_cookie
    ).await?;

    let nft_cookie = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        None
    ).await?;

    let nft_cookie2 = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        None
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let nft_weight_record_cookies = nft_voter_test.with_create_nft_weight_record(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&nft_cookie, &nft_cookie2]
    ).await?;

    let cnft_weight_record = nft_weight_record_cookies[0].address;
    let cnft_weight_record_info = nft_voter_test.get_nft_weight_record(&cnft_weight_record).await;
    assert!(cnft_weight_record_info.weight == 3);

    let cnft_weight_record2 = nft_weight_record_cookies[1].address;
    let cnft_weight_record_info2 = nft_voter_test.get_nft_weight_record(&cnft_weight_record2).await;
    assert!(cnft_weight_record_info2.weight == 3);

    Ok(())
}

#[tokio::test]
async fn test_create_nft_weight_record_with_unverified_collection_error() -> Result<
    (),
    TransportError
> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let nft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &nft_collection_cookie,
        &max_voter_weight_record_cookie,
        Some(ConfigureCollectionArgs {
            weight: 3,
            size: 11,
        })
    ).await?;

    let voter_cookie = nft_voter_test.bench.with_wallet().await;
    let voter_weight_record_cookie = nft_voter_test.with_voter_weight_record(
        &registrar_cookie,
        &voter_cookie
    ).await?;

    let nft_cookie = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        Some(CreateNftArgs {
            verify_collection: false,
            ..Default::default()
        })
    ).await?;

    let err = nft_voter_test
        .with_create_nft_weight_record(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_cookie,
            &[&nft_cookie]
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::CollectionMustBeVerified);
    Ok(())
}

#[tokio::test]
async fn test_create_nft_weight_record_with_invalid_metadata_error() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let nft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &nft_collection_cookie,
        &max_voter_weight_record_cookie,
        Some(ConfigureCollectionArgs {
            weight: 3,
            size: 11,
        })
    ).await?;

    let voter_cookie = nft_voter_test.bench.with_wallet().await;
    let voter_weight_record_cookie = nft_voter_test.with_voter_weight_record(
        &registrar_cookie,
        &voter_cookie
    ).await?;

    let mut nft1_cookie = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        Some(CreateNftArgs {
            verify_collection: false,
            ..Default::default()
        })
    ).await?;

    let nft2_cookie = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        None
    ).await?;

    // Try to use verified NFT Metadata
    nft1_cookie.metadata = nft2_cookie.metadata;

    let err = nft_voter_test
        .with_create_nft_weight_record(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_cookie,
            &[&nft1_cookie]
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::TokenMetadataDoesNotMatch);
    Ok(())
}

#[tokio::test]
async fn test_create_nft_weight_record_with_invalid_collection_error() -> Result<
    (),
    TransportError
> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let nft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &nft_collection_cookie,
        &max_voter_weight_record_cookie,
        Some(ConfigureCollectionArgs {
            weight: 3,
            size: 11,
        })
    ).await?;

    let voter_cookie = nft_voter_test.bench.with_wallet().await;
    let voter_weight_record_cookie = nft_voter_test.with_voter_weight_record(
        &registrar_cookie,
        &voter_cookie
    ).await?;

    let nft_collection_cookie2 = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    let nft_cookie = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie2,
        &voter_cookie,
        None
    ).await?;

    let err = nft_voter_test
        .with_create_nft_weight_record(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_cookie,
            &[&nft_cookie]
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::CollectionNotFound);
    Ok(())
}

#[tokio::test]
async fn test_create_nft_weight_record_with_no_nft_error() -> Result<(), TransportError> {
    // Arrange
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let nft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &nft_collection_cookie,
        &max_voter_weight_record_cookie,
        Some(ConfigureCollectionArgs {
            weight: 10,
            size: 20,
        })
    ).await?;

    let voter_cookie = nft_voter_test.bench.with_wallet().await;

    let voter_weight_record_cookie = nft_voter_test.with_voter_weight_record(
        &registrar_cookie,
        &voter_cookie
    ).await?;

    let nft_cookie = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        Some(CreateNftArgs {
            amount: 0,
            ..Default::default()
        })
    ).await?;

    // Act
    let err = nft_voter_test
        .with_create_nft_weight_record(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_cookie,
            &[&nft_cookie]
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::InvalidNftAmount);
    Ok(())
}
