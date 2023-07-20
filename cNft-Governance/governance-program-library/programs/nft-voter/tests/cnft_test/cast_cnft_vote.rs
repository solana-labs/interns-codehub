use gpl_nft_voter::{ error::NftVoterError, state::* };
use crate::program_test::nft_voter_test::*;
use solana_program_test::*;
use solana_sdk::transport::TransportError;
use spl_governance::error::GovernanceError;
use spl_account_compression::error::AccountCompressionError;
use crate::program_test::tools::{ assert_nft_voter_err, assert_gov_err, assert_compression_err };
use crate::program_test::merkle_tree_test::MerkleTreeArgs;

#[tokio::test]
pub async fn test_cast_cnft_vote() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    // mint compressed nft
    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;
    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;
    let clock = nft_voter_test.bench.get_clock().await;

    let (leaf_verification_cookie, proofs, asset_id) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let cnft_vote_record_cookies = nft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&asset_id],
        &[&proofs],
        None
    ).await?;

    let cnft_vote_record = nft_voter_test.get_nft_vote_record_account(
        &cnft_vote_record_cookies[0].address
    ).await;

    assert_eq!(cnft_vote_record_cookies[0].account, cnft_vote_record);

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 3);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(voter_weight_record.weight_action, Some(VoterWeightAction::CastVote.into()));
    assert_eq!(voter_weight_record.weight_action_target, Some(proposal_cookie.address));

    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_multiple_nfts() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    // first nft
    let leaf_cookie1 = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    let leaf_cookie2 = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;
    let clock = nft_voter_test.bench.get_clock().await;

    let (leaf_verification_cookie1, proofs1, asset_id1) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie1,
            5,
            8
        ).await?;

    let (leaf_verification_cookie2, proofs2, asset_id2) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie2,
            5,
            8
        ).await?;

    let cnft_vote_record_cookies = nft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &[&leaf_cookie1, &leaf_cookie2],
        &[&leaf_verification_cookie1, &leaf_verification_cookie2],
        &[&asset_id1, &asset_id2],
        &[&proofs1, &proofs2],
        None
    ).await?;

    let cnft_vote_record1 = nft_voter_test.get_nft_vote_record_account(
        &cnft_vote_record_cookies[0].address
    ).await;
    assert_eq!(cnft_vote_record_cookies[0].account, cnft_vote_record1);

    let cnft_vote_record2 = nft_voter_test.get_nft_vote_record_account(
        &cnft_vote_record_cookies[1].address
    ).await;
    assert_eq!(cnft_vote_record_cookies[1].account, cnft_vote_record2);

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 6);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(voter_weight_record.weight_action, Some(VoterWeightAction::CastVote.into()));
    assert_eq!(voter_weight_record.weight_action_target, Some(proposal_cookie.address));

    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_multiple_trees() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie1 = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;
    let mut tree_cookie2 = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie1 = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie1,
        &voter_cookie
    ).await?;
    let leaf_cookie2 = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie2,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;
    let clock = nft_voter_test.bench.get_clock().await;

    let (leaf_verification_cookie1, proofs1, asset_id1) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie1,
            &leaf_cookie1,
            5,
            8
        ).await?;

    let (leaf_verification_cookie2, proofs2, asset_id2) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie2,
            &leaf_cookie2,
            5,
            8
        ).await?;

    let cnft_vote_record_cookies = nft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &[&leaf_cookie1, &leaf_cookie2],
        &[&leaf_verification_cookie1, &leaf_verification_cookie2],
        &[&asset_id1, &asset_id2],
        &[&proofs1, &proofs2],
        None
    ).await?;

    let cnft_vote_record1 = nft_voter_test.get_nft_vote_record_account(
        &cnft_vote_record_cookies[0].address
    ).await;
    assert_eq!(cnft_vote_record_cookies[0].account, cnft_vote_record1);

    let cnft_vote_record2 = nft_voter_test.get_nft_vote_record_account(
        &cnft_vote_record_cookies[1].address
    ).await;
    assert_eq!(cnft_vote_record_cookies[1].account, cnft_vote_record2);

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 6);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(voter_weight_record.weight_action, Some(VoterWeightAction::CastVote.into()));
    assert_eq!(voter_weight_record.weight_action_target, Some(proposal_cookie.address));
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_multiple_trees_and_different_size() -> Result<
    (),
    TransportError
> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie1 = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let tree_size2 = MerkleTreeArgs {
        max_depth: 14,
        max_buffer_size: 64,
        public: Some(false),
    };
    let mut tree_cookie2 = nft_voter_test.merkle_tree.with_merkle_tree(Some(tree_size2)).await?;

    let leaf_cookie1 = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie1,
        &voter_cookie
    ).await?;
    let leaf_cookie2 = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie2,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;
    let clock = nft_voter_test.bench.get_clock().await;

    let (leaf_verification_cookie1, proofs1, asset_id1) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie1,
            &leaf_cookie1,
            5,
            8
        ).await?;

    let (leaf_verification_cookie2, proofs2, asset_id2) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie2,
            &leaf_cookie2,
            5,
            8
        ).await?;

    let cnft_vote_record_cookies = nft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &[&leaf_cookie1, &leaf_cookie2],
        &[&leaf_verification_cookie1, &leaf_verification_cookie2],
        &[&asset_id1, &asset_id2],
        &[&proofs1, &proofs2],
        None
    ).await?;

    let cnft_vote_record1 = nft_voter_test.get_nft_vote_record_account(
        &cnft_vote_record_cookies[0].address
    ).await;
    assert_eq!(cnft_vote_record_cookies[0].account, cnft_vote_record1);

    let cnft_vote_record2 = nft_voter_test.get_nft_vote_record_account(
        &cnft_vote_record_cookies[1].address
    ).await;
    assert_eq!(cnft_vote_record_cookies[1].account, cnft_vote_record2);

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 6);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(voter_weight_record.weight_action, Some(VoterWeightAction::CastVote.into()));
    assert_eq!(voter_weight_record.weight_action_target, Some(proposal_cookie.address));
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_cnft_already_voted_error() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    // mint compressed nft
    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs, asset_id) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    nft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&asset_id],
        &[&proofs],
        None
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let err = nft_voter_test
        .cast_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &[&leaf_cookie],
            &[&leaf_verification_cookie],
            &[&asset_id],
            &[&proofs],
            None
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::NftAlreadyVoted);

    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_invalid_voter_error() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;
    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs, asset_id) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let voter_cookie2 = nft_voter_test.bench.with_wallet().await;

    let err = nft_voter_test
        .cast_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie2,
            &[&leaf_cookie],
            &[&leaf_verification_cookie],
            &[&asset_id],
            &[&proofs],
            None
        ).await
        .err()
        .unwrap();
    println!("error: {}", err);
    assert_gov_err(err, GovernanceError::GoverningTokenOwnerOrDelegateMustSign);
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_unverified_collection_error() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;
    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (mut leaf_verification_cookie, proofs, asset_id) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    if let Some(collection) = leaf_verification_cookie.collection.as_mut() {
        collection.verified = false;
    }

    let err = nft_voter_test
        .cast_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &[&leaf_cookie],
            &[&leaf_verification_cookie],
            &[&asset_id],
            &[&proofs],
            None
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::CollectionMustBeVerified);
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_invalid_owner_error() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let voter_cookie2 = nft_voter_test.bench.with_wallet().await;
    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;
    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie2
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs, asset_id) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let err = nft_voter_test
        .cast_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &[&leaf_cookie],
            &[&leaf_verification_cookie],
            &[&asset_id],
            &[&proofs],
            None
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::VoterDoesNotOwnNft);
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_invalid_collection_error() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
        &max_voter_weight_record_cookie,
        Some(ConfigureCollectionArgs {
            weight: 3,
            size: 11,
        })
    ).await?;
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;
    let voter_cookie = nft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = nft_voter_test.governance.with_token_owner_record(
        &realm_cookie,
        &voter_cookie
    ).await?;
    let voter_weight_record_cookie = nft_voter_test.with_voter_weight_record(
        &registrar_cookie,
        &voter_cookie
    ).await?;

    let cnft_collection_cookie2 = nft_voter_test.token_metadata.with_nft_collection(
        Some(10)
    ).await?;

    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;
    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie2,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs, asset_id) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let err = nft_voter_test
        .cast_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &[&leaf_cookie],
            &[&leaf_verification_cookie],
            &[&asset_id],
            &[&proofs],
            None
        ).await
        .err()
        .unwrap();

    // assert_nft_voter_err(err, NftVoterError::InvalidCollectionMint);
    assert_nft_voter_err(err, NftVoterError::CollectionNotFound);
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_invalid_metadata_error() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    // mint compressed nft
    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (mut leaf_verification_cookie, proofs, asset_id) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let leaf_cookie2 = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    leaf_verification_cookie = CompressedNftAsset {
        name: leaf_cookie2.metadata.name.clone(),
        symbol: leaf_cookie2.metadata.symbol.clone(),
        uri: leaf_cookie2.metadata.uri.clone(),
        seller_fee_basis_points: leaf_cookie2.metadata.seller_fee_basis_points,
        primary_sale_happened: leaf_cookie2.metadata.primary_sale_happened,
        is_mutable: leaf_cookie2.metadata.is_mutable,
        edition_nonce: leaf_cookie2.metadata.edition_nonce,
        nonce: leaf_cookie2.nonce,
        index: leaf_cookie2.index,
        ..leaf_verification_cookie
    };
    let err = nft_voter_test
        .cast_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &[&leaf_cookie],
            &[&leaf_verification_cookie],
            &[&asset_id],
            &[&proofs],
            None
        ).await
        .err()
        .unwrap();

    assert_compression_err(err, AccountCompressionError::ConcurrentMerkleTreeError);
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_same_nft_error() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    // mint compressed nft
    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs, asset_id) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let err = nft_voter_test
        .cast_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &[&leaf_cookie, &leaf_cookie],
            &[&leaf_verification_cookie, &leaf_verification_cookie],
            &[&asset_id, &asset_id],
            &[&proofs, &proofs],
            None
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::DuplicatedNftDetected);
    Ok(())
}

/// max 4 cnft will be allowed when 5 proofs for each cnft
#[tokio::test]
async fn test_cast_cnft_vote_with_max_4_nfts() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    // mint compressed nft
    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let mut leaf_cookies = vec![];
    let mut leaf_verification_cookies = vec![];
    let mut proofs = vec![];
    let mut asset_ids = vec![];

    for _ in 0..4 {
        let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
            &cnft_collection_cookie,
            &mut tree_cookie,
            &voter_cookie
        ).await?;

        leaf_cookies.push(leaf_cookie);
    }

    nft_voter_test.bench.advance_clock().await;
    let clock = nft_voter_test.bench.get_clock().await;

    for leaf_cookie in leaf_cookies.iter() {
        let (leaf_verification_cookie, proofs_i, asset_id) =
            nft_voter_test.merkle_tree.get_leaf_verification_info(
                &mut tree_cookie,
                &leaf_cookie,
                5,
                8
            ).await?;

        leaf_verification_cookies.push(leaf_verification_cookie);
        proofs.push(proofs_i);
        asset_ids.push(asset_id);
    }
    let cnft_vote_record_cookies = nft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &leaf_cookies.iter().collect::<Vec<_>>(),
        &leaf_verification_cookies.iter().collect::<Vec<_>>(),
        &asset_ids.iter().collect::<Vec<_>>(),
        &proofs.iter().collect::<Vec<_>>(),
        None
    ).await?;

    let cnft_vote_record1 = nft_voter_test.get_nft_vote_record_account(
        &cnft_vote_record_cookies[0].address
    ).await;

    assert_eq!(cnft_vote_record_cookies[0].account, cnft_vote_record1);

    let cnft_vote_record2 = nft_voter_test.get_nft_vote_record_account(
        &cnft_vote_record_cookies[1].address
    ).await;

    assert_eq!(cnft_vote_record_cookies[1].account, cnft_vote_record2);

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 12);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(voter_weight_record.weight_action, Some(VoterWeightAction::CastVote.into()));
    assert_eq!(voter_weight_record.weight_action_target, Some(proposal_cookie.address));
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_using_multiple_instructions() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie1 = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    let leaf_cookie2 = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;
    let clock = nft_voter_test.bench.get_clock().await;

    let (leaf_verification_cookie1, proofs1, asset_id1) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie1,
            5,
            8
        ).await?;

    let (leaf_verification_cookie2, proofs2, asset_id2) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie2,
            5,
            8
        ).await?;

    let args = CastNftVoteArgs {
        cast_spl_gov_vote: false,
    };

    nft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &[&leaf_cookie1],
        &[&leaf_verification_cookie1],
        &[&asset_id1],
        &[&proofs1],
        Some(args)
    ).await?;

    nft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &[&leaf_cookie2],
        &[&leaf_verification_cookie2],
        &[&asset_id2],
        &[&proofs2],
        None
    ).await?;

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 6);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(voter_weight_record.weight_action, Some(VoterWeightAction::CastVote.into()));
    assert_eq!(voter_weight_record.weight_action_target, Some(proposal_cookie.address));
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_using_multiple_instructions_with_nft_already_voted_error() -> Result<
    (),
    TransportError
> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs, asset_id) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let args = CastNftVoteArgs {
        cast_spl_gov_vote: false,
    };

    nft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&asset_id],
        &[&proofs],
        Some(args)
    ).await?;

    let err = nft_voter_test
        .cast_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &[&leaf_cookie],
            &[&leaf_verification_cookie],
            &[&asset_id],
            &[&proofs],
            None
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::NftAlreadyVoted);

    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_using_multiple_instructions_with_attempted_sandwiched_relinquish() -> Result<
    (),
    TransportError
> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs, asset_id) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let args = CastNftVoteArgs {
        cast_spl_gov_vote: false,
    };

    let cnft_vote_record_cookies = nft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&asset_id],
        &[&proofs],
        Some(args)
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    nft_voter_test.relinquish_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &cnft_vote_record_cookies
    ).await?;

    nft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&asset_id],
        &[&proofs],
        None
    ).await?;

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 3);

    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_using_delegate() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs, asset_id) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let delegate_cookie = nft_voter_test.bench.with_wallet().await;
    nft_voter_test.governance.set_governance_delegate(
        &realm_cookie,
        &voter_token_owner_record_cookie,
        &voter_cookie,
        &Some(delegate_cookie.address)
    ).await;

    let cnft_vote_record_cookies = nft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &delegate_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&asset_id],
        &[&proofs],
        None
    ).await?;

    let cnft_vote_record = nft_voter_test.get_nft_vote_record_account(
        &cnft_vote_record_cookies[0].address
    ).await;
    assert_eq!(cnft_vote_record_cookies[0].account, cnft_vote_record);

    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_invalid_voter_weight_token_owner_error() -> Result<
    (),
    TransportError
> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let realm_cookie = nft_voter_test.governance.with_realm().await?;
    let registrar_cookie = nft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = nft_voter_test.with_max_voter_weight_record(
        &registrar_cookie
    ).await?;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;

    nft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
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

    let voter_cookie2 = nft_voter_test.bench.with_wallet().await;
    let voter_weight_record_cookie2 = nft_voter_test.with_voter_weight_record(
        &registrar_cookie,
        &voter_cookie2
    ).await?;

    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs, asset_id) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let err = nft_voter_test
        .cast_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie2,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &[&leaf_cookie],
            &[&leaf_verification_cookie],
            &[&asset_id],
            &[&proofs],
            None
        ).await
        .err()
        .unwrap();
    assert_nft_voter_err(err, NftVoterError::InvalidTokenOwnerForVoterWeightRecord);
    Ok(())
}

// add test wrong asset id?

// test multiple trees
