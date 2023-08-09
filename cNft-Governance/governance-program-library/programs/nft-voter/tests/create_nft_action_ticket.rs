use crate::program_test::{ tools::assert_nft_voter_err, token_metadata_test::CreateNftArgs };
use gpl_nft_voter::state::VoterWeightAction;
use gpl_nft_voter::error::NftVoterError;
use program_test::nft_voter_test::*;
use solana_program_test::*;
use solana_sdk::transport::TransportError;
mod program_test;

#[tokio::test]
async fn test_create_nft_action_ticket() -> Result<(), TransportError> {
    let action = VoterWeightAction::CastVote;
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

    let nft_action_ticket_cookies = nft_voter_test.with_create_nft_action_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&nft_cookie],
        &action
    ).await?;

    let nft_action_ticket = &nft_action_ticket_cookies[0].address;
    let nft_action_ticket_info = nft_voter_test.get_nft_action_ticket(&nft_action_ticket).await;

    assert!(nft_action_ticket_info.weight == 3);

    Ok(())
}

#[tokio::test]
async fn test_create_nft_action_ticket_with_multiple_nfts() -> Result<(), TransportError> {
    let action = VoterWeightAction::CastVote;
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

    let nft_action_ticket_cookies = nft_voter_test.with_create_nft_action_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&nft_cookie, &nft_cookie2],
        &action
    ).await?;

    let cnft_action_ticket = nft_action_ticket_cookies[0].address;
    let cnft_action_ticket_info = nft_voter_test.get_nft_action_ticket(&cnft_action_ticket).await;
    assert!(cnft_action_ticket_info.weight == 3);

    let cnft_action_ticket2 = nft_action_ticket_cookies[1].address;
    let cnft_action_ticket_info2 = nft_voter_test.get_nft_action_ticket(&cnft_action_ticket2).await;
    assert!(cnft_action_ticket_info2.weight == 3);

    Ok(())
}

#[tokio::test]
async fn test_create_nft_action_ticket_with_unverified_collection_error() -> Result<
    (),
    TransportError
> {
    let action = VoterWeightAction::CastVote;
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
        .with_create_nft_action_ticket(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_cookie,
            &[&nft_cookie],
            &action
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::CollectionMustBeVerified);
    Ok(())
}

#[tokio::test]
async fn test_create_nft_action_ticket_with_invalid_metadata_error() -> Result<(), TransportError> {
    let action = VoterWeightAction::CastVote;
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
        .with_create_nft_action_ticket(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_cookie,
            &[&nft1_cookie],
            &action
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::TokenMetadataDoesNotMatch);
    Ok(())
}

#[tokio::test]
async fn test_create_nft_action_ticket_with_invalid_collection_error() -> Result<
    (),
    TransportError
> {
    let action = VoterWeightAction::CastVote;
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
        .with_create_nft_action_ticket(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_cookie,
            &[&nft_cookie],
            &action
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::CollectionNotFound);
    Ok(())
}

#[tokio::test]
async fn test_create_nft_action_ticket_with_no_nft_error() -> Result<(), TransportError> {
    let action = VoterWeightAction::CastVote;
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
        .with_create_nft_action_ticket(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_cookie,
            &[&nft_cookie],
            &action
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::InvalidNftAmount);
    Ok(())
}

#[tokio::test]
async fn test_create_nft_action_ticket_using_delegate() -> Result<(), TransportError> {
    let action = VoterWeightAction::CastVote;
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
    let voter_token_owner_record_cookie = nft_voter_test.governance.with_token_owner_record(
        &realm_cookie,
        &voter_cookie
    ).await?;
    let voter_weight_record_cookie = nft_voter_test.with_voter_weight_record(
        &registrar_cookie,
        &voter_cookie
    ).await?;

    let nft_cookie = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        None
    ).await?;

    let delegate_cookie = nft_voter_test.bench.with_wallet().await;
    nft_voter_test.governance.set_governance_delegate(
        &realm_cookie,
        &voter_token_owner_record_cookie,
        &voter_cookie,
        &Some(delegate_cookie.address)
    ).await;

    let delegate_signers = &[&delegate_cookie.signer];

    let nft_action_ticket_cookies = nft_voter_test.with_create_nft_action_ticket_using_ix(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&nft_cookie],
        &action,
        |i| {
            i.accounts[2].pubkey = delegate_cookie.address;
        },
        Some(delegate_signers)
    ).await?;

    let nft_action_ticket = &nft_action_ticket_cookies[0].address;
    let nft_action_ticket_info = nft_voter_test.get_nft_action_ticket(&nft_action_ticket).await;

    assert!(nft_action_ticket_info.weight == 3);

    Ok(())
}
