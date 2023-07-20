use crate::program_test::nft_voter_test::ConfigureCollectionArgs;
use gpl_nft_voter::state::*;
use program_test::nft_voter_test::*;

use solana_program_test::*;
use solana_sdk::transport::TransportError;

mod program_test;
mod nft_test;
mod cnft_test;

#[tokio::test]
async fn test_cast_nft_and_cnft_vote() -> Result<(), TransportError> {
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
    let voter_token_owner_record_cookie = nft_voter_test.governance.with_token_owner_record(
        &realm_cookie,
        &voter_cookie
    ).await?;
    let voter_weight_record_cookie = nft_voter_test.with_voter_weight_record(
        &registrar_cookie,
        &voter_cookie
    ).await?;
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let nft_cookie1 = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        None
    ).await?;

    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;
    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &nft_collection_cookie,
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

    let args = CastNftVoteArgs {
        cast_spl_gov_vote: false,
    };

    nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &[&nft_cookie1],
        Some(args)
    ).await?;

    let nft_vote_record_cookies = nft_voter_test.cast_cnft_vote(
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

    // Assert
    let nft_vote_record = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookies[0].address
    ).await;

    assert_eq!(nft_vote_record_cookies[0].account, nft_vote_record);

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 20);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(voter_weight_record.weight_action, Some(VoterWeightAction::CastVote.into()));
    assert_eq!(voter_weight_record.weight_action_target, Some(proposal_cookie.address));

    Ok(())
}

#[tokio::test]
async fn test_cast_nft_and_cnft_vote_reverse_order() -> Result<(), TransportError> {
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
    let voter_token_owner_record_cookie = nft_voter_test.governance.with_token_owner_record(
        &realm_cookie,
        &voter_cookie
    ).await?;
    let voter_weight_record_cookie = nft_voter_test.with_voter_weight_record(
        &registrar_cookie,
        &voter_cookie
    ).await?;
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let nft_cookie1 = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        None
    ).await?;

    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;
    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &nft_collection_cookie,
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

    let args = CastNftVoteArgs {
        cast_spl_gov_vote: false,
    };

    let nft_vote_record_cookies = nft_voter_test.cast_cnft_vote(
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

    nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &[&nft_cookie1],
        Some(args)
    ).await?;

    // Assert
    let nft_vote_record = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookies[0].address
    ).await;

    assert_eq!(nft_vote_record_cookies[0].account, nft_vote_record);

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 20);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(voter_weight_record.weight_action, Some(VoterWeightAction::CastVote.into()));
    assert_eq!(voter_weight_record.weight_action_target, Some(proposal_cookie.address));

    Ok(())
}

#[tokio::test]
async fn test_cast_nft_and_cnft_vote_using_multiple_instructions_with_attempted_sandwiched_relinquish() -> Result<
    (),
    TransportError
> {
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
    let voter_token_owner_record_cookie = nft_voter_test.governance.with_token_owner_record(
        &realm_cookie,
        &voter_cookie
    ).await?;
    let voter_weight_record_cookie = nft_voter_test.with_voter_weight_record(
        &registrar_cookie,
        &voter_cookie
    ).await?;
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let nft_cookie1 = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        None
    ).await?;

    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;
    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &nft_collection_cookie,
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

    nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &[&nft_cookie1],
        None
    ).await?;

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 10);

    Ok(())
}
