use gpl_cnft_voter::{state::*, error::CompressedNftVoterError};
use program_test::cnft_voter_test::*;
use solana_program_test::*;
use solana_sdk::transport::TransportError;
use spl_governance::error::GovernanceError;

use crate::program_test::tools::{assert_cnft_voter_err, assert_gov_err};
mod program_test;

#[tokio::test]
async fn test_cast_cnft_vote() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            Some(ConfigureCollectionArgs {
                weight: 3,
                size: 11,
            }),
        )
        .await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test
        .governance
        .with_token_owner_record(&realm_cookie, &voter_cookie)
        .await?;
    let voter_weight_record_cookie = cnft_voter_test
        .with_voter_weight_record(&registrar_cookie, &voter_cookie)
        .await?;
    let proposal_cookie = cnft_voter_test
        .governance
        .with_proposal(&realm_cookie)
        .await?;

    // mint compressed nft
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
        .await?;

    cnft_voter_test.bench.advance_clock().await;
    let clock = cnft_voter_test.bench.get_clock().await;

    let (leaf_verification_cookie, proofs) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie, 5, 8)
        .await?;
    
    let cnft_vote_record_cookie = cnft_voter_test
        .cast_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &cnft_collection_cookie,
            &tree_cookie,
            &[&leaf_cookie],
            &[&leaf_verification_cookie],
            &[&proofs],
            None,
        )
        .await?;

    let cnft_vote_record = cnft_voter_test
        .get_cnft_vote_record_account(&cnft_vote_record_cookie[0].address)
        .await;

    assert_eq!(cnft_vote_record_cookie[0].account, cnft_vote_record);

    let voter_weight_record = cnft_voter_test
        .get_voter_weight_record(&voter_weight_record_cookie.address)
        .await;

    assert_eq!(voter_weight_record.voter_weight, 3);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(
        voter_weight_record.weight_action,
        Some(VoterWeightAction::CastVote.into())
    );
    assert_eq!(
        voter_weight_record.weight_action_target,
        Some(proposal_cookie.address)
    );

    Ok(())
}


#[tokio::test]
async fn test_cast_cnft_vote_with_multiple_nfts() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            Some(ConfigureCollectionArgs {
                weight: 3,
                size: 11,
            }),
        )
        .await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test
        .governance
        .with_token_owner_record(&realm_cookie, &voter_cookie)
        .await?;
    let voter_weight_record_cookie = cnft_voter_test
        .with_voter_weight_record(&registrar_cookie, &voter_cookie)
        .await?;
    let proposal_cookie = cnft_voter_test
        .governance
        .with_proposal(&realm_cookie)
        .await?;


    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    // first nft
    let leaf_cookie1 = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
        .await?;

    let leaf_cookie2 = cnft_voter_test
    .token_metadata
    .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
    .await?;

    cnft_voter_test.bench.advance_clock().await;
    let clock = cnft_voter_test.bench.get_clock().await;

    let (leaf_verification_cookie1, proofs1) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie1, 5, 8)
        .await?;

    let (leaf_verification_cookie2, proofs2) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie2, 5, 8)
        .await?;

    let cnft_vote_record_cookie = cnft_voter_test
        .cast_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &cnft_collection_cookie,
            &tree_cookie,
            &[&leaf_cookie1, &leaf_cookie2],
            &[&leaf_verification_cookie1, &leaf_verification_cookie2],
            &[&proofs1, &proofs2],
            None,
        )
        .await?;

    let cnft_vote_record1 = cnft_voter_test
        .get_cnft_vote_record_account(&cnft_vote_record_cookie[0].address)
        .await;
    assert_eq!(cnft_vote_record_cookie[0].account, cnft_vote_record1);

    let cnft_vote_record2 = cnft_voter_test
        .get_cnft_vote_record_account(&cnft_vote_record_cookie[1].address)
        .await;
    assert_eq!(cnft_vote_record_cookie[1].account, cnft_vote_record2);

    let voter_weight_record = cnft_voter_test
        .get_voter_weight_record(&voter_weight_record_cookie.address)
        .await;

    assert_eq!(voter_weight_record.voter_weight, 6);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(
        voter_weight_record.weight_action,
        Some(VoterWeightAction::CastVote.into())
    );
    assert_eq!(
        voter_weight_record.weight_action_target,
        Some(proposal_cookie.address)
    );

    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_cnft_already_voted_error() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            Some(ConfigureCollectionArgs {
                weight: 3,
                size: 11,
            }),
        )
        .await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test
        .governance
        .with_token_owner_record(&realm_cookie, &voter_cookie)
        .await?;
    let voter_weight_record_cookie = cnft_voter_test
        .with_voter_weight_record(&registrar_cookie, &voter_cookie)
        .await?;
    let proposal_cookie = cnft_voter_test
        .governance
        .with_proposal(&realm_cookie)
        .await?;

    // mint compressed nft
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
        .await?;

    cnft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie, 5, 8)
        .await?;
    
    cnft_voter_test.cast_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &cnft_collection_cookie,
            &tree_cookie,
            &[&leaf_cookie],
            &[&leaf_verification_cookie],
            &[&proofs],
            None,
        )
        .await?;

    cnft_voter_test.bench.advance_clock().await;
    
    let err = cnft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &cnft_collection_cookie,
        &tree_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&proofs],
        None,
    )
    .await.err().unwrap();

    assert_cnft_voter_err(err, CompressedNftVoterError::NftAlreadyVoted);

    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_invalid_voter_error() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            Some(ConfigureCollectionArgs {
                weight: 3,
                size: 11,
            }),
        )
        .await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test
        .governance.with_token_owner_record(&realm_cookie, &voter_cookie)
        .await?;
    let voter_weight_record_cookie = cnft_voter_test.with_voter_weight_record(&registrar_cookie, &voter_cookie).await?;
    let proposal_cookie = cnft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;
    let leaf_cookie = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
        .await?;

    cnft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie, 5, 8)
        .await?;

    let voter_cookie2 = cnft_voter_test.bench.with_wallet().await;

    let err = cnft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie2,
        &cnft_collection_cookie,
        &tree_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&proofs],
        None,
    )
    .await.err().unwrap();
    println!("error: {}", err);
    assert_gov_err(err, GovernanceError::GoverningTokenOwnerOrDelegateMustSign);
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_unverified_collection_error() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            Some(ConfigureCollectionArgs {
                weight: 3,
                size: 11,
            }),
        )
        .await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test
        .governance.with_token_owner_record(&realm_cookie, &voter_cookie)
        .await?;
    let voter_weight_record_cookie = cnft_voter_test.with_voter_weight_record(&registrar_cookie, &voter_cookie).await?;
    let proposal_cookie = cnft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;
    let leaf_cookie = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
        .await?;

    cnft_voter_test.bench.advance_clock().await;

    let (mut leaf_verification_cookie, proofs) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie, 5, 8)
        .await?;

    if let Some(collection) = leaf_verification_cookie.metadata.collection.as_mut() {
        collection.verified = false;
    }

    let err = cnft_voter_test.cast_cnft_vote(
        &registrar_cookie, 
        &voter_weight_record_cookie, 
        &voter_token_owner_record_cookie, 
        &max_voter_weight_record_cookie, 
        &proposal_cookie, 
        &voter_cookie, 
        &cnft_collection_cookie, 
        &tree_cookie, 
        &[&leaf_cookie], 
        &[&leaf_verification_cookie], 
        &[&proofs], 
        None).
        await.err().unwrap();

    assert_cnft_voter_err(err, CompressedNftVoterError::CollectionMustBeVerified);
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_invalid_owner_error() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            Some(ConfigureCollectionArgs {
                weight: 3,
                size: 11,
            }),
        )
        .await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test
        .governance.with_token_owner_record(&realm_cookie, &voter_cookie)
        .await?;
    let voter_weight_record_cookie = cnft_voter_test.with_voter_weight_record(&registrar_cookie, &voter_cookie).await?;
    let proposal_cookie = cnft_voter_test.governance.with_proposal(&realm_cookie).await?;

    let voter_cookie2 = cnft_voter_test.bench.with_wallet().await;
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;
    let leaf_cookie = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie2)
        .await?;
    
    cnft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie, 5, 8)
        .await?;

    let err = cnft_voter_test.cast_cnft_vote(
        &registrar_cookie, 
        &voter_weight_record_cookie, 
        &voter_token_owner_record_cookie, 
        &max_voter_weight_record_cookie, 
        &proposal_cookie, 
        &voter_cookie, 
        &cnft_collection_cookie, 
        &tree_cookie, 
        &[&leaf_cookie], 
        &[&leaf_verification_cookie], 
        &[&proofs], 
        None).
        await.err().unwrap();
    
    assert_cnft_voter_err(err, CompressedNftVoterError::VoterDoesNotOwnNft);
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_invalid_collection_error() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            Some(ConfigureCollectionArgs {
                weight: 3,
                size: 11,
            }),
        )
        .await?;
    let proposal_cookie = cnft_voter_test.governance.with_proposal(&realm_cookie).await?;
    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test
        .governance.with_token_owner_record(&realm_cookie, &voter_cookie)
        .await?;
    let voter_weight_record_cookie = cnft_voter_test.with_voter_weight_record(&registrar_cookie, &voter_cookie).await?;
    
    let cnft_collection_cookie2 = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;
    let leaf_cookie = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie2, &mut tree_cookie, &voter_cookie)
        .await?;

    cnft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie, 5, 8)
        .await?;

    let err = cnft_voter_test.cast_cnft_vote(
        &registrar_cookie, 
        &voter_weight_record_cookie, 
        &voter_token_owner_record_cookie, 
        &max_voter_weight_record_cookie, 
        &proposal_cookie, 
        &voter_cookie, 
        &cnft_collection_cookie, 
        &tree_cookie, 
        &[&leaf_cookie], 
        &[&leaf_verification_cookie], 
        &[&proofs], 
        None).
        await.err().unwrap();

    assert_cnft_voter_err(err, CompressedNftVoterError::InvalidCollectionMint);
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_invalid_metadata_error() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            Some(ConfigureCollectionArgs {
                weight: 3,
                size: 11,
            }),
        )
        .await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test
        .governance
        .with_token_owner_record(&realm_cookie, &voter_cookie)
        .await?;
    let voter_weight_record_cookie = cnft_voter_test
        .with_voter_weight_record(&registrar_cookie, &voter_cookie)
        .await?;
    let proposal_cookie = cnft_voter_test
        .governance
        .with_proposal(&realm_cookie)
        .await?;

    // mint compressed nft
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
        .await?;

    cnft_voter_test.bench.advance_clock().await;

    let (mut leaf_verification_cookie, proofs) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie, 5, 8)
        .await?;

    let leaf_cookie2 = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
        .await?;

    leaf_verification_cookie.metadata = leaf_cookie2.metadata.clone();
    let err = cnft_voter_test.cast_cnft_vote(
        &registrar_cookie, 
        &voter_weight_record_cookie, 
        &voter_token_owner_record_cookie, 
        &max_voter_weight_record_cookie, 
        &proposal_cookie, 
        &voter_cookie, 
        &cnft_collection_cookie, 
        &tree_cookie, 
        &[&leaf_cookie], 
        &[&leaf_verification_cookie], 
        &[&proofs], 
        None).
        await.err().unwrap();
    
    assert_cnft_voter_err(err, CompressedNftVoterError::TokenMetadataDoesNotMatch);
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_same_nft_error() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            Some(ConfigureCollectionArgs {
                weight: 3,
                size: 11,
            }),
        )
        .await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test
        .governance
        .with_token_owner_record(&realm_cookie, &voter_cookie)
        .await?;
    let voter_weight_record_cookie = cnft_voter_test
        .with_voter_weight_record(&registrar_cookie, &voter_cookie)
        .await?;
    let proposal_cookie = cnft_voter_test
        .governance
        .with_proposal(&realm_cookie)
        .await?;

    // mint compressed nft
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
        .await?;

    cnft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie, 5, 8)
        .await?;
    
    let err = cnft_voter_test.cast_cnft_vote(
        &registrar_cookie, 
        &voter_weight_record_cookie, 
        &voter_token_owner_record_cookie, 
        &max_voter_weight_record_cookie, 
        &proposal_cookie, 
        &voter_cookie, 
        &cnft_collection_cookie, 
        &tree_cookie, 
        &[&leaf_cookie, &leaf_cookie], 
        &[&leaf_verification_cookie, &leaf_verification_cookie], 
        &[&proofs, &proofs], 
        None).
        await.err().unwrap();
    
    assert_cnft_voter_err(err, CompressedNftVoterError::DuplicatedNftDetected);
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_max_5_nfts() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            Some(ConfigureCollectionArgs {
                weight: 3,
                size: 11,
            }),
        )
        .await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test
        .governance
        .with_token_owner_record(&realm_cookie, &voter_cookie)
        .await?;
    let voter_weight_record_cookie = cnft_voter_test
        .with_voter_weight_record(&registrar_cookie, &voter_cookie)
        .await?;
    let proposal_cookie = cnft_voter_test
        .governance
        .with_proposal(&realm_cookie)
        .await?;

    // mint compressed nft
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let mut leaf_cookies = vec![];
    let mut leaf_verification_cookies = vec![];
    let mut proofs = vec![];
    
    for _ in 0..5 {
        let leaf_cookie = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
        .await?;

        cnft_voter_test.bench.advance_clock().await;

        let (leaf_verification_cookie, proofs_i) = cnft_voter_test
            .merkle_tree
            .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie, 5, 8)
            .await?;

        leaf_cookies.push(leaf_cookie);
        leaf_verification_cookies.push(leaf_verification_cookie);
        proofs.push(proofs_i);
    }
    
    cnft_voter_test.bench.advance_clock().await;
    let clock = cnft_voter_test.bench.get_clock().await;

    let cnft_vote_record_cookies = cnft_voter_test.cast_cnft_vote(
        &registrar_cookie, 
        &voter_weight_record_cookie, 
        &voter_token_owner_record_cookie, 
        &max_voter_weight_record_cookie, 
        &proposal_cookie, 
        &voter_cookie, 
        &cnft_collection_cookie, 
        &tree_cookie, 
        &leaf_cookies.iter().collect::<Vec<_>>(), 
        &leaf_verification_cookies.iter().collect::<Vec<_>>(), 
        &proofs.iter().collect::<Vec<_>>(), 
        None).
        await?;
    
    let cnft_vote_record1 = cnft_voter_test
    .get_cnft_vote_record_account(&cnft_vote_record_cookies[0].address)
    .await;

    assert_eq!(cnft_vote_record_cookies[0].account, cnft_vote_record1);

    let cnft_vote_record2 = cnft_voter_test
        .get_cnft_vote_record_account(&cnft_vote_record_cookies[1].address)
        .await;

    assert_eq!(cnft_vote_record_cookies[1].account, cnft_vote_record2);

    let voter_weight_record = cnft_voter_test
        .get_voter_weight_record(&voter_weight_record_cookie.address)
        .await;

    assert_eq!(voter_weight_record.voter_weight, 15);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(
        voter_weight_record.weight_action,
        Some(VoterWeightAction::CastVote.into())
    );
    assert_eq!(
        voter_weight_record.weight_action_target,
        Some(proposal_cookie.address)
    );
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_using_multiple_instructions() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            Some(ConfigureCollectionArgs {
                weight: 3,
                size: 11,
            }),
        )
        .await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test
        .governance
        .with_token_owner_record(&realm_cookie, &voter_cookie)
        .await?;
    let voter_weight_record_cookie = cnft_voter_test
        .with_voter_weight_record(&registrar_cookie, &voter_cookie)
        .await?;
    let proposal_cookie = cnft_voter_test
        .governance
        .with_proposal(&realm_cookie)
        .await?;

    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie1 = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
        .await?;

    let leaf_cookie2 = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
        .await?;

    cnft_voter_test.bench.advance_clock().await;
    let clock = cnft_voter_test.bench.get_clock().await;

    let (leaf_verification_cookie1, proofs1) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie1, 5, 8)
        .await?;

    let (leaf_verification_cookie2, proofs2) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie2, 5, 8)
        .await?;

    let args = CastCompressedNftVoteArgs {
        cast_spl_gov_vote: false,
    };
    
    cnft_voter_test.cast_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &cnft_collection_cookie,
            &tree_cookie,
            &[&leaf_cookie1],
            &[&leaf_verification_cookie1],
            &[&proofs1],
            Some(args),
        )
        .await?;
    
    cnft_voter_test.cast_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &cnft_collection_cookie,
            &tree_cookie,
            &[&leaf_cookie2],
            &[&leaf_verification_cookie2],
            &[&proofs2],
            None,
        )
        .await?;

    let voter_weight_record = cnft_voter_test
    .get_voter_weight_record(&voter_weight_record_cookie.address)
    .await;

    assert_eq!(voter_weight_record.voter_weight, 6);
    assert_eq!(voter_weight_record.voter_weight_expiry, Some(clock.slot));
    assert_eq!(
        voter_weight_record.weight_action,
        Some(VoterWeightAction::CastVote.into())
    );
    assert_eq!(
        voter_weight_record.weight_action_target,
        Some(proposal_cookie.address)
    );
    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_using_multiple_instructions_with_nft_already_voted_error() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            Some(ConfigureCollectionArgs {
                weight: 3,
                size: 11,
            }),
        )
        .await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test
        .governance
        .with_token_owner_record(&realm_cookie, &voter_cookie)
        .await?;
    let voter_weight_record_cookie = cnft_voter_test
        .with_voter_weight_record(&registrar_cookie, &voter_cookie)
        .await?;
    let proposal_cookie = cnft_voter_test
        .governance
        .with_proposal(&realm_cookie)
        .await?;

    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
        .await?;

    cnft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie, 5, 8)
        .await?;

    let args = CastCompressedNftVoteArgs {
        cast_spl_gov_vote: false,
    };
    
    cnft_voter_test.cast_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &cnft_collection_cookie,
            &tree_cookie,
            &[&leaf_cookie],
            &[&leaf_verification_cookie],
            &[&proofs],
            Some(args),
        )
        .await?;

    let err = cnft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &cnft_collection_cookie,
        &tree_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&proofs],
        None,
    )
    .await.err().unwrap();

    assert_cnft_voter_err(err, CompressedNftVoterError::NftAlreadyVoted);

    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_using_multiple_instructions_with_attempted_sandwiched_relinquish() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            Some(ConfigureCollectionArgs {
                weight: 3,
                size: 11,
            }),
        )
        .await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test
        .governance
        .with_token_owner_record(&realm_cookie, &voter_cookie)
        .await?;
    let voter_weight_record_cookie = cnft_voter_test
        .with_voter_weight_record(&registrar_cookie, &voter_cookie)
        .await?;
    let proposal_cookie = cnft_voter_test
        .governance
        .with_proposal(&realm_cookie)
        .await?;

    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
        .await?;

    cnft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie, 5, 8)
        .await?;

    let args = CastCompressedNftVoteArgs {
        cast_spl_gov_vote: false,
    };

    let cnft_vote_record_cookies = cnft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &cnft_collection_cookie,
        &tree_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&proofs],
        Some(args),
    )
    .await?;

    cnft_voter_test.bench.advance_clock().await;

    cnft_voter_test.relinquish_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &voter_token_owner_record_cookie,
        &cnft_vote_record_cookies,
    )
    .await?;

    cnft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &cnft_collection_cookie,
        &tree_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&proofs],
        None,
    )
    .await?;

    let voter_weight_record = cnft_voter_test
        .get_voter_weight_record(&voter_weight_record_cookie.address)
        .await;

    assert_eq!(voter_weight_record.voter_weight, 3);

    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_using_delegate() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            Some(ConfigureCollectionArgs {
                weight: 3,
                size: 11,
            }),
        )
        .await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test
        .governance
        .with_token_owner_record(&realm_cookie, &voter_cookie)
        .await?;
    let voter_weight_record_cookie = cnft_voter_test
        .with_voter_weight_record(&registrar_cookie, &voter_cookie)
        .await?;
    let proposal_cookie = cnft_voter_test
        .governance
        .with_proposal(&realm_cookie)
        .await?;

    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
        .await?;

    cnft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie, 5, 8)
        .await?;

    let delegate_cookie = cnft_voter_test.bench.with_wallet().await;
    cnft_voter_test.governance.set_governance_delegate(
        &realm_cookie, 
        &voter_token_owner_record_cookie, 
        &voter_cookie, 
        &Some(delegate_cookie.address)
    ).await;

    let cnft_vote_record_cookies = cnft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &delegate_cookie,
        &cnft_collection_cookie,
        &tree_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&proofs],
        None,
    )
    .await?;

    let cnft_vote_record = cnft_voter_test
        .get_cnft_vote_record_account(&cnft_vote_record_cookies[0].address)
        .await;
    assert_eq!(cnft_vote_record_cookies[0].account, cnft_vote_record);

    Ok(())
}

#[tokio::test]
async fn test_cast_cnft_vote_with_invalid_voter_weight_token_owner_error() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test
        .with_max_voter_weight_record(&registrar_cookie)
        .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    cnft_voter_test
        .with_collection(
            &registrar_cookie,
            &cnft_collection_cookie,
            &max_voter_weight_record_cookie,
            Some(ConfigureCollectionArgs {
                weight: 3,
                size: 11,
            }),
        )
        .await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test
        .governance
        .with_token_owner_record(&realm_cookie, &voter_cookie)
        .await?;

    let voter_cookie2 = cnft_voter_test.bench.with_wallet().await;
    let voter_weight_record_cookie2 = cnft_voter_test
        .with_voter_weight_record(&registrar_cookie, &voter_cookie2)
        .await?;
    
    let proposal_cookie = cnft_voter_test
        .governance
        .with_proposal(&realm_cookie)
        .await?;

    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, &voter_cookie)
        .await?;

    cnft_voter_test.bench.advance_clock().await;

    let (leaf_verification_cookie, proofs) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie, 5, 8)
        .await?;

    let err = cnft_voter_test.cast_cnft_vote(
        &registrar_cookie,
        &voter_weight_record_cookie2,
        &voter_token_owner_record_cookie,
        &max_voter_weight_record_cookie,
        &proposal_cookie,
        &voter_cookie,
        &cnft_collection_cookie,
        &tree_cookie,
        &[&leaf_cookie],
        &[&leaf_verification_cookie],
        &[&proofs],
        None,
    )
    .await.err().unwrap();
    assert_cnft_voter_err(err, CompressedNftVoterError::InvalidTokenOwnerForVoterWeightRecord);
    Ok(())
}