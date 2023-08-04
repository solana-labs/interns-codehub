use program_test::cnft_voter_test::*;
use solana_program_test::*;
use solana_sdk::transport::TransportError;

mod program_test;

#[tokio::test]
async fn test_mint_compressed_nft() -> Result<(), TransportError> {
    let cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let cnft_collection_cookie = cnft_voter_test.token_metadata.with_nft_collection().await?;
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = cnft_voter_test.token_metadata.with_compressed_nft(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;
    assert_eq!(leaf_cookie.index, u32::try_from(leaf_cookie.nonce).unwrap());
    assert_eq!(leaf_cookie.nonce + 1, tree_cookie.num_minted);
    Ok(())
}

#[tokio::test]
async fn test_mint_multiple_compressed_nft() -> Result<(), TransportError> {
    let cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let cnft_collection_cookie = cnft_voter_test.token_metadata.with_nft_collection().await?;
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    for _ in 0..5 {
        let leaf_cookie = cnft_voter_test.token_metadata.with_compressed_nft(
            &cnft_collection_cookie,
            &mut tree_cookie,
            &voter_cookie
        ).await?;
        assert_eq!(leaf_cookie.index, u32::try_from(leaf_cookie.nonce).unwrap());
        assert_eq!(leaf_cookie.nonce + 1, tree_cookie.num_minted);
    }
    Ok(())
}

#[tokio::test]
async fn test_mint_compressed_nft_to_collection() -> Result<(), TransportError> {
    let cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let cnft_collection_cookie = cnft_voter_test.token_metadata.with_cnft_collection(10).await?;
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = cnft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    assert_eq!(leaf_cookie.index, u32::try_from(leaf_cookie.nonce).unwrap());
    assert_eq!(leaf_cookie.nonce + 1, tree_cookie.num_minted);
    Ok(())
}

#[tokio::test]
async fn test_mint_multiple_compressed_nft_to_collection() -> Result<(), TransportError> {
    let cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let cnft_collection_cookie = cnft_voter_test.token_metadata.with_cnft_collection(10).await?;
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    for _ in 0..5 {
        let leaf_cookie = cnft_voter_test.token_metadata.with_compressed_nft_to_collection(
            &cnft_collection_cookie,
            &mut tree_cookie,
            &voter_cookie
        ).await?;

        assert_eq!(leaf_cookie.index, u32::try_from(leaf_cookie.nonce).unwrap());
        assert_eq!(leaf_cookie.nonce + 1, tree_cookie.num_minted);
    }
    Ok(())
}

// #[tokio::test]
// async fn test_leaf_verification() -> Result<(), TransportError> {
//     let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
//     let max_depth = 5;
//     let max_buffer_size = 8;
//     let voter_cookie = cnft_voter_test.bench.with_wallet().await;
//     let cnft_collection_cookie = cnft_voter_test.token_metadata.with_cnft_collection(10).await?;
//     let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

//     let leaf_cookie = cnft_voter_test.token_metadata.with_compressed_nft_to_collection(
//         &cnft_collection_cookie,
//         &mut tree_cookie,
//         &voter_cookie
//     ).await?;

//     let root = cnft_voter_test.merkle_tree.decode_root(
//         &tree_cookie.address,
//         max_depth,
//         max_buffer_size
//     ).await?;
//     assert_eq!(Pubkey::from(root), Pubkey::from(tree_cookie.proof_tree.get_root()));

//     let (leaf_verification_cookie, proofs, asset_id) =
//         cnft_voter_test.merkle_tree.get_leaf_verification_info(
//             &mut tree_cookie,
//             &leaf_cookie,
//             max_depth,
//             max_buffer_size
//         ).await?;

//     assert!(leaf_cookie.asset_id == asset_id);
//     assert!(leaf_verification_cookie.root != [0u8; 32]);
//     assert!(leaf_verification_cookie.index == leaf_cookie.index);
//     assert!(proofs.len() == max_depth - (tree_cookie.canopy_depth as usize));

//     cnft_voter_test.with_cnft_verification(
//         &voter_cookie,
//         &leaf_cookie,
//         &leaf_verification_cookie,
//         &proofs
//     ).await?;
//     Ok(())
// }
