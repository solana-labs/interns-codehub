use gpl_nft_voter::error::NftVoterError;
use crate::program_test::nft_voter_test::*;
use solana_program_test::*;
use solana_sdk::transport::TransportError;
use spl_governance::error::GovernanceError;

use crate::program_test::tools::{ assert_nft_voter_err, assert_gov_err };

// relinquish vote after the proposal has ended
#[tokio::test]
async fn test_relinquish_cnft_vote() -> Result<(), TransportError> {
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
            weight: 1,
            size: 1,
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

    nft_voter_test.bench.advance_clock().await;

    nft_voter_test.relinquish_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &cnft_vote_record_cookies
    ).await?;

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight_expiry, Some(0));
    assert_eq!(voter_weight_record.voter_weight, 0);

    // Check NftVoteRecord was disposed
    let cnft_vote_record = nft_voter_test.bench.get_account(
        &cnft_vote_record_cookies[0].address
    ).await;

    assert_eq!(None, cnft_vote_record);
    Ok(())
}

#[tokio::test]
async fn test_relinquish_cnft_vote_for_proposal_in_voting_state() -> Result<(), TransportError> {
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
        None
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

    nft_voter_test.governance.relinquish_vote(
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie
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

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight_expiry, Some(0));
    assert_eq!(voter_weight_record.voter_weight, 0);

    let cnft_vote_record = nft_voter_test.bench.get_account(
        &cnft_vote_record_cookies[0].address
    ).await;
    assert_eq!(None, cnft_vote_record);

    Ok(())
}

#[tokio::test]
async fn test_relinquish_cnft_vote_for_proposal_in_voting_state_and_vote_record_exists_error() -> Result<
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
        None
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

    let err = nft_voter_test
        .relinquish_nft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &voter_token_owner_record_cookie,
            &cnft_vote_record_cookies
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::VoteRecordMustBeWithdrawn);
    Ok(())
}

#[tokio::test]
async fn test_relinquish_cnft_vote_with_invalid_voter_error() -> Result<(), TransportError> {
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
        Some(ConfigureCollectionArgs { weight: 1, size: 1 })
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

    let voter_cookie2 = nft_voter_test.bench.with_wallet().await;

    let err = nft_voter_test
        .relinquish_nft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie2,
            &voter_token_owner_record_cookie,
            &cnft_vote_record_cookies
        ).await
        .err()
        .unwrap();

    assert_gov_err(err, GovernanceError::GoverningTokenOwnerOrDelegateMustSign);

    Ok(())
}

#[tokio::test]
async fn test_relinquish_cnft_vote_unexpired_vote_weight_record() -> Result<(), TransportError> {
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
        Some(ConfigureCollectionArgs { weight: 3, size: 5 })
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

    let err = nft_voter_test
        .relinquish_nft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &voter_token_owner_record_cookie,
            &cnft_vote_record_cookies
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::VoterWeightRecordMustBeExpired);
    Ok(())
}

#[tokio::test]
async fn test_relinquish_cnft_vote_with_invalid_voter_weight_token_owner_error() -> Result<
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
        None
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

    let voter_cookie2 = nft_voter_test.bench.with_wallet().await;
    let voter_weight_record_cookie2 = nft_voter_test.with_voter_weight_record(
        &registrar_cookie,
        &voter_cookie2
    ).await?;

    let err = nft_voter_test
        .relinquish_nft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie2,
            &proposal_cookie,
            &voter_cookie,
            &voter_token_owner_record_cookie,
            &cnft_vote_record_cookies
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::InvalidTokenOwnerForVoterWeightRecord);

    Ok(())
}

#[tokio::test]
async fn test_relinquish_cnft_vote_using_delegate() -> Result<(), TransportError> {
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
        Some(ConfigureCollectionArgs { weight: 1, size: 1 })
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

    nft_voter_test.bench.advance_clock().await;

    let delegate_cookie = nft_voter_test.bench.with_wallet().await;
    nft_voter_test.governance.set_governance_delegate(
        &realm_cookie,
        &voter_token_owner_record_cookie,
        &voter_cookie,
        &Some(delegate_cookie.address)
    ).await;

    nft_voter_test.relinquish_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &proposal_cookie,
        &delegate_cookie,
        &voter_token_owner_record_cookie,
        &cnft_vote_record_cookies
    ).await?;

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight_expiry, Some(0));
    assert_eq!(voter_weight_record.voter_weight, 0);

    // Check NftVoteRecord was disposed
    let cnft_vote_record = nft_voter_test.bench.get_account(
        &cnft_vote_record_cookies[0].address
    ).await;

    assert_eq!(None, cnft_vote_record);
    Ok(())
}
