// use gpl_cnft_voter::error::CompressedNftVoterError;
// use gpl_cnft_voter::{cnft_voter, state::*};
use program_test::cnft_voter_test::*;
use solana_program::pubkey::Pubkey;
use solana_program_test::*;
use solana_sdk::transport::TransportError;

mod program_test;

#[tokio::test]
async fn test_cast_cnft_vote() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    // let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    // let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    // let max_voter_weight_record_cookie = cnft_voter_test
    //     .with_max_voter_weight_record(&registrar_cookie)
    //     .await?;
    let cnft_collection_cookie = cnft_voter_test
        .token_metadata
        .with_cnft_collection(10)
        .await?;

    // let collection_config_cookie = cnft_voter_test
    //     .with_collection(
    //         &registrar_cookie,
    //         &cnft_collection_cookie,
    //         &max_voter_weight_record_cookie,
    //         Some(ConfigureCollectionArgs { weight: 1, size: 5 }),
    //     )
    //     .await?;

    // let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    // let voter_token_owner_record_cookie = cnft_voter_test
    //     .governance
    //     .with_token_owner_record(&realm_cookie, &voter_cookie)
    //     .await?;
    // let voter_weight_record_cookie = cnft_voter_test
    //     .with_voter_weight_record(&registrar_cookie, &voter_cookie)
    //     .await?;
    // let proposal_cookie = cnft_voter_test
    //     .governance
    //     .with_proposal(&realm_cookie)
    //     .await?;

    // mint compressed nft
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = cnft_voter_test
        .token_metadata
        .with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie)
        .await?;

    let (leaf_verification_cookie, proofs) = cnft_voter_test
        .merkle_tree
        .get_leaf_verification_info(&mut tree_cookie, &leaf_cookie, 5, 8)
        .await?;

    println!("{}", proofs.len());
    println!("{:?}", proofs);
    println!("{}", Pubkey::from(leaf_verification_cookie.root));
    println!(
        "{}, {}",
        leaf_verification_cookie.index, leaf_verification_cookie.nonce
    );

    cnft_voter_test
        .with_cnft_verification(
            &mut tree_cookie,
            &leaf_cookie,
            &leaf_verification_cookie,
            &proofs,
        )
        .await?;
    Ok(())
}
