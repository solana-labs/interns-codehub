// use gpl_cnft_voter::error::CompressedNftVoterError;
use gpl_cnft_voter::state::*;
use program_test::cnft_voter_test::*;
use solana_program_test::*;
use solana_sdk::transport::TransportError;
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

    cnft_voter_test
        .with_cnft_verification(
            &voter_cookie,
            &mut tree_cookie,
            &leaf_cookie,
            &leaf_verification_cookie,
            &proofs,
        )
        .await?;

    // Act
    let cnft_vote_record_cookie = cnft_voter_test
        .cast_one_cnft_vote(
            &registrar_cookie,
            &voter_weight_record_cookie,
            &voter_token_owner_record_cookie,
            &max_voter_weight_record_cookie,
            &proposal_cookie,
            &voter_cookie,
            &cnft_collection_cookie,
            &tree_cookie,
            &leaf_cookie,
            &leaf_verification_cookie,
            &proofs,
            None,
        )
        .await?;

    let cnft_vote_record = cnft_voter_test
        .get_cnft_vote_record_account(&cnft_vote_record_cookie.address)
        .await;

    assert_eq!(cnft_vote_record_cookie.account, cnft_vote_record);

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
