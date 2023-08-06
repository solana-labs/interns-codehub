use gpl_nft_voter::{ error::NftVoterError, state::* };
use program_test::nft_voter_test::*;
use program_test::tools::assert_gov_err;
use solana_program_test::*;
use solana_sdk::transport::TransportError;
use spl_governance::error::GovernanceError;
use crate::program_test::tools::assert_nft_voter_err;
use crate::program_test::merkle_tree_test::MerkleTreeArgs;
mod program_test;

#[tokio::test]
async fn test_cast_nft_vote_with_nft() -> Result<(), TransportError> {
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let nft_cookie = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        None
    ).await?;

    nft_voter_test.bench.advance_clock().await;
    let clock = nft_voter_test.bench.get_clock().await;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_nft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&nft_cookie]
    ).await?;

    let nft_vote_record_cookies: Vec<NftVoteRecordCookie> = nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
        None
    ).await?;

    let nft_vote_record = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookies[0].address
    ).await;

    assert_eq!(nft_vote_record_cookies[0].account, nft_vote_record);

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 3);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(voter_weight_record.weight_action, Some(VoterWeightAction::CastVote.into()));
    assert_eq!(voter_weight_record.weight_action_target, Some(proposal_cookie.address));

    let nft_vote_ticket_address = nft_vote_ticket_cookies[0].address;
    let nft_vote_ticket = nft_voter_test.bench.get_account(&nft_vote_ticket_address).await;

    assert_eq!(None, nft_vote_ticket);

    Ok(())
}

#[tokio::test]
async fn test_cast_nft_vote_with_cnft() -> Result<(), TransportError> {
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    // mint compressed nft
    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &nft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;
    let clock = nft_voter_test.bench.get_clock().await;

    let (leaf_verification_cookie, proofs, _) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_cnft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&proofs]
    ).await?;

    let nft_vote_record_cookies: Vec<NftVoteRecordCookie> = nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
        None
    ).await?;

    let nft_vote_record = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookies[0].address
    ).await;
    assert_eq!(nft_vote_record_cookies[0].account, nft_vote_record);

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 3);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(voter_weight_record.weight_action, Some(VoterWeightAction::CastVote.into()));
    assert_eq!(voter_weight_record.weight_action_target, Some(proposal_cookie.address));

    let cnft_vote_ticket_address = nft_vote_ticket_cookies[0].address;
    let cnft_vote_ticket = nft_voter_test.bench.get_account(&cnft_vote_ticket_address).await;

    assert_eq!(None, cnft_vote_ticket);

    Ok(())
}

#[tokio::test]
async fn test_cast_nft_vote_with_nft_and_cnft() -> Result<(), TransportError> {
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let nft_cookie = nft_voter_test.token_metadata.with_nft_v2(
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

    let nft_vote_ticket_cookies = nft_voter_test.with_create_nft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&nft_cookie]
    ).await?;

    let (leaf_verification_cookie, proofs, _) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;
    let cnft_vote_ticket_cookies = nft_voter_test.with_create_cnft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&proofs]
    ).await?;

    let nft_vote_record_cookies: Vec<NftVoteRecordCookie> = nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &[&nft_vote_ticket_cookies[0], &cnft_vote_ticket_cookies[0]],
        None
    ).await?;

    let cnft_vote_record = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookies[0].address
    ).await;

    assert_eq!(nft_vote_record_cookies[0].account, cnft_vote_record);

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 6);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(voter_weight_record.weight_action, Some(VoterWeightAction::CastVote.into()));
    assert_eq!(voter_weight_record.weight_action_target, Some(proposal_cookie.address));

    let nft_vote_ticket_address = nft_vote_ticket_cookies[0].address;
    let nft_vote_ticket = nft_voter_test.bench.get_account(&nft_vote_ticket_address).await;
    assert_eq!(None, nft_vote_ticket);

    let cnft_vote_ticket_address = cnft_vote_ticket_cookies[0].address;
    let cnft_vote_ticket = nft_voter_test.bench.get_account(&cnft_vote_ticket_address).await;
    assert_eq!(None, cnft_vote_ticket);

    Ok(())
}

#[tokio::test]
async fn test_cast_nft_vote_with_multiple_nfts() -> Result<(), TransportError> {
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

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
    let clock = nft_voter_test.bench.get_clock().await;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_nft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&nft_cookie, &nft_cookie2]
    ).await?;

    let nft_vote_record_cookies: Vec<NftVoteRecordCookie> = nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
        None
    ).await?;

    let nft_vote_record = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookies[0].address
    ).await;

    assert_eq!(nft_vote_record_cookies[0].account, nft_vote_record);

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 6);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(voter_weight_record.weight_action, Some(VoterWeightAction::CastVote.into()));
    assert_eq!(voter_weight_record.weight_action_target, Some(proposal_cookie.address));

    let nft_vote_ticket_address = nft_vote_ticket_cookies[0].address;
    let nft_vote_ticket = nft_voter_test.bench.get_account(&nft_vote_ticket_address).await;
    assert_eq!(None, nft_vote_ticket);

    let nft_vote_ticket_address2 = nft_vote_ticket_cookies[1].address;
    let nft_vote_ticket2 = nft_voter_test.bench.get_account(&nft_vote_ticket_address2).await;
    assert_eq!(None, nft_vote_ticket2);

    Ok(())
}

#[tokio::test]
async fn test_cast_nft_vote_with_multiple_cnfts() -> Result<(), TransportError> {
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    // first nft
    let leaf_cookie1 = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &nft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    let leaf_cookie2 = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &nft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;
    let clock = nft_voter_test.bench.get_clock().await;

    let (leaf_verification_cookie1, proofs1, _) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie1,
            5,
            8
        ).await?;

    let (leaf_verification_cookie2, proofs2, _) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie2,
            5,
            8
        ).await?;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_cnft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&leaf_cookie1, &leaf_cookie2],
        &[&leaf_verification_cookie1, &leaf_verification_cookie2],
        &[&proofs1, &proofs2]
    ).await?;

    let nft_vote_record_cookies = nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
        None
    ).await?;

    let cnft_vote_record1 = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookies[0].address
    ).await;
    assert_eq!(nft_vote_record_cookies[0].account, cnft_vote_record1);

    let cnft_vote_record2 = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookies[1].address
    ).await;
    assert_eq!(nft_vote_record_cookies[1].account, cnft_vote_record2);

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
async fn test_cast_nft_vote_with_multiple_trees() -> Result<(), TransportError> {
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie1 = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;
    let mut tree_cookie2 = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie1 = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &nft_collection_cookie,
        &mut tree_cookie1,
        &voter_cookie
    ).await?;
    let leaf_cookie2 = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &nft_collection_cookie,
        &mut tree_cookie2,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;
    let clock = nft_voter_test.bench.get_clock().await;

    let (leaf_verification_cookie1, proofs1, _) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie1,
            &leaf_cookie1,
            5,
            8
        ).await?;

    let (leaf_verification_cookie2, proofs2, _) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie2,
            &leaf_cookie2,
            5,
            8
        ).await?;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_cnft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&leaf_cookie1, &leaf_cookie2],
        &[&leaf_verification_cookie1, &leaf_verification_cookie2],
        &[&proofs1, &proofs2]
    ).await?;

    let nft_vote_record_cookies = nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
        None
    ).await?;

    let cnft_vote_record1 = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookies[0].address
    ).await;
    assert_eq!(nft_vote_record_cookies[0].account, cnft_vote_record1);

    let cnft_vote_record2 = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookies[1].address
    ).await;
    assert_eq!(nft_vote_record_cookies[1].account, cnft_vote_record2);

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
async fn test_cast_nft_vote_with_multiple_trees_and_different_size() -> Result<(), TransportError> {
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie1 = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let tree_size2 = MerkleTreeArgs {
        max_depth: 14,
        max_buffer_size: 64,
        public: Some(false),
    };
    let mut tree_cookie2 = nft_voter_test.merkle_tree.with_merkle_tree(Some(tree_size2)).await?;

    let leaf_cookie1 = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &nft_collection_cookie,
        &mut tree_cookie1,
        &voter_cookie
    ).await?;
    let leaf_cookie2 = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &nft_collection_cookie,
        &mut tree_cookie2,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;
    let clock = nft_voter_test.bench.get_clock().await;

    let (leaf_verification_cookie1, proofs1, _) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie1,
            &leaf_cookie1,
            5,
            8
        ).await?;

    let (leaf_verification_cookie2, proofs2, _) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie2,
            &leaf_cookie2,
            5,
            8
        ).await?;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_cnft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&leaf_cookie1, &leaf_cookie2],
        &[&leaf_verification_cookie1, &leaf_verification_cookie2],
        &[&proofs1, &proofs2]
    ).await?;

    let nft_vote_record_cookies = nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
        None
    ).await?;

    let cnft_vote_record1 = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookies[0].address
    ).await;
    assert_eq!(nft_vote_record_cookies[0].account, cnft_vote_record1);

    let cnft_vote_record2 = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookies[1].address
    ).await;
    assert_eq!(nft_vote_record_cookies[1].account, cnft_vote_record2);

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
async fn test_cast_nft_vote_with_nft_already_voted_error() -> Result<(), TransportError> {
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let nft_cookie = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        None
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_nft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&nft_cookie]
    ).await?;

    nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
        None
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let err = nft_voter_test
        .cast_nft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &voter_token_owner_record_cookie,
            &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
            None
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::NftAlreadyVoted);

    Ok(())
}

#[tokio::test]
async fn test_cast_nft_vote_with_cnft_already_voted_error() -> Result<(), TransportError> {
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    // mint compressed nft
    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &nft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs, _) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_cnft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&proofs]
    ).await?;

    nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
        None
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let err = nft_voter_test
        .cast_nft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &voter_token_owner_record_cookie,
            &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
            None
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::NftAlreadyVoted);

    Ok(())
}

#[tokio::test]
async fn test_cast_nft_vote_with_nft_invalid_voter_error() -> Result<(), TransportError> {
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let nft_cookie = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        None
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_nft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&nft_cookie]
    ).await?;

    let voter_cookie2 = nft_voter_test.bench.with_wallet().await;
    let err = nft_voter_test
        .cast_nft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie2,
            &voter_token_owner_record_cookie,
            &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
            None
        ).await
        .err()
        .unwrap();

    assert_gov_err(err, GovernanceError::GoverningTokenOwnerOrDelegateMustSign);
    Ok(())
}

#[tokio::test]
async fn test_cast_nft_vote_with_cnft_invalid_voter_error() -> Result<(), TransportError> {
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;
    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &nft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs, _) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_cnft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&proofs]
    ).await?;

    let voter_cookie2 = nft_voter_test.bench.with_wallet().await;

    let err = nft_voter_test
        .cast_nft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie2,
            &voter_token_owner_record_cookie,
            &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
            None
        ).await
        .err()
        .unwrap();

    assert_gov_err(err, GovernanceError::GoverningTokenOwnerOrDelegateMustSign);
    Ok(())
}

#[tokio::test]
async fn test_cast_nft_vote_with_same_nft_error() -> Result<(), TransportError> {
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let nft_cookie = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        None
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_nft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&nft_cookie]
    ).await?;

    let err = nft_voter_test
        .cast_nft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &voter_token_owner_record_cookie,
            &[&nft_vote_ticket_cookies[0], &nft_vote_ticket_cookies[0]],
            None
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::DuplicatedNftDetected);
    Ok(())
}

#[tokio::test]
async fn test_cast_nft_vote_using_multiple_instructions_with_nft_attempted_sandwiched_relinquish() -> Result<
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
    let voter_token_owner_record_cookie = nft_voter_test.governance.with_token_owner_record(
        &realm_cookie,
        &voter_cookie
    ).await?;
    let voter_weight_record_cookie = nft_voter_test.with_voter_weight_record(
        &registrar_cookie,
        &voter_cookie
    ).await?;
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let nft_cookie = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        None
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_nft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&nft_cookie]
    ).await?;

    let args = CastNftVoteArgs {
        cast_spl_gov_vote: false,
    };

    let nft_vote_record_cookiess = nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
        Some(args)
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    nft_voter_test.relinquish_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_record_cookiess
    ).await?;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_nft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&nft_cookie]
    ).await?;

    nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
        None
    ).await?;

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 3);

    Ok(())
}

#[tokio::test]
async fn test_cast_nft_vote_using_multiple_instructions_with_cnft_attempted_sandwiched_relinquish() -> Result<
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
        &nft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs, _) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_cnft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&proofs]
    ).await?;

    let args = CastNftVoteArgs {
        cast_spl_gov_vote: false,
    };

    let nft_vote_record_cookiess = nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
        Some(args)
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    nft_voter_test.relinquish_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_record_cookiess
    ).await?;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_cnft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&proofs]
    ).await?;

    nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
        None
    ).await?;

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 3);

    Ok(())
}

#[tokio::test]
async fn test_cast_nft_vote_using_delegate_with_nft() -> Result<(), TransportError> {
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let nft_cookie = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        None
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_nft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&nft_cookie]
    ).await?;

    let delegate_cookie = nft_voter_test.bench.with_wallet().await;
    nft_voter_test.governance.set_governance_delegate(
        &realm_cookie,
        &voter_token_owner_record_cookie,
        &voter_cookie,
        &Some(delegate_cookie.address)
    ).await;

    let nft_vote_record_cookiess = nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &delegate_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
        None
    ).await?;

    let cnft_vote_record = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookiess[0].address
    ).await;
    assert_eq!(nft_vote_record_cookiess[0].account, cnft_vote_record);

    Ok(())
}

#[tokio::test]
async fn test_cast_nft_vote_using_delegate_with_cnft() -> Result<(), TransportError> {
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
    let proposal_cookie = nft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &nft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs, _) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_cnft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&proofs]
    ).await?;

    let delegate_cookie = nft_voter_test.bench.with_wallet().await;
    nft_voter_test.governance.set_governance_delegate(
        &realm_cookie,
        &voter_token_owner_record_cookie,
        &voter_cookie,
        &Some(delegate_cookie.address)
    ).await;

    let nft_vote_record_cookiess = nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &delegate_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
        None
    ).await?;

    let cnft_vote_record = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookiess[0].address
    ).await;
    assert_eq!(nft_vote_record_cookiess[0].account, cnft_vote_record);

    Ok(())
}

#[tokio::test]
async fn test_cast_nft_vote_with_nft_invalid_voter_weight_token_owner_error() -> Result<
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

    let nft_cookie = nft_voter_test.token_metadata.with_nft_v2(
        &nft_collection_cookie,
        &voter_cookie,
        None
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_nft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&nft_cookie]
    ).await?;

    let err = nft_voter_test
        .cast_nft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie2,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &voter_token_owner_record_cookie,
            &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
            None
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::InvalidTokenOwnerForVoterWeightRecord);
    Ok(())
}

#[tokio::test]
async fn test_cast_nft_vote_with_cnft_invalid_voter_weight_token_owner_error() -> Result<
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
        &nft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    nft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs, _) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            5,
            8
        ).await?;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_cnft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&proofs]
    ).await?;

    let err = nft_voter_test
        .cast_nft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie2,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &voter_token_owner_record_cookie,
            &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
            None
        ).await
        .err()
        .unwrap();

    assert_nft_voter_err(err, NftVoterError::InvalidTokenOwnerForVoterWeightRecord);
    Ok(())
}

#[tokio::test]
async fn test_cast_nft_vote_with_max_5_nfts() -> Result<(), TransportError> {
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

    let mut nft_cookies = vec![];

    for _ in 0..5 {
        nft_voter_test.bench.advance_clock().await;
        let nft_cookie = nft_voter_test.token_metadata.with_nft_v2(
            &nft_collection_cookie,
            &voter_cookie,
            None
        ).await?;

        nft_cookies.push(nft_cookie);
    }

    nft_voter_test.bench.advance_clock().await;
    let clock = nft_voter_test.bench.get_clock().await;

    let nft_vote_ticket_cookies = nft_voter_test.with_create_nft_vote_ticket(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_cookie,
        &nft_cookies.iter().collect::<Vec<_>>()
    ).await?;

    let nft_vote_record_cookies: Vec<NftVoteRecordCookie> = nft_voter_test.cast_nft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &nft_vote_ticket_cookies.iter().collect::<Vec<_>>(),
        None
    ).await?;

    // Assert
    let nft_vote_record1 = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookies[0].address
    ).await;

    assert_eq!(nft_vote_record_cookies[0].account, nft_vote_record1);

    let nft_vote_record2 = nft_voter_test.get_nft_vote_record_account(
        &nft_vote_record_cookies[1].address
    ).await;

    assert_eq!(nft_vote_record_cookies[1].account, nft_vote_record2);

    let voter_weight_record = nft_voter_test.get_voter_weight_record(
        &voter_weight_record_cookie.address
    ).await;

    assert_eq!(voter_weight_record.voter_weight, 15);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(voter_weight_record.weight_action, Some(VoterWeightAction::CastVote.into()));
    assert_eq!(voter_weight_record.weight_action_target, Some(proposal_cookie.address));

    Ok(())
}
