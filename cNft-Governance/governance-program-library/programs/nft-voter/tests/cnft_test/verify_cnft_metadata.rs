use std::convert::TryFrom;
use crate::program_test::nft_voter_test::*;
use solana_program::pubkey::Pubkey;
use solana_program_test::*;
use solana_sdk::transport::TransportError;

#[tokio::test]
async fn test_mint_compressed_nft() -> Result<(), TransportError> {
    let nft_voter_test = NftVoterTest::start_new().await;
    let voter_cookie = nft_voter_test.bench.with_wallet().await;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;
    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft(
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
    let nft_voter_test = NftVoterTest::start_new().await;
    let voter_cookie = nft_voter_test.bench.with_wallet().await;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;
    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    for _ in 0..5 {
        let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft(
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
    let nft_voter_test = NftVoterTest::start_new().await;
    let voter_cookie = nft_voter_test.bench.with_wallet().await;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;
    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
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
    let nft_voter_test = NftVoterTest::start_new().await;
    let voter_cookie = nft_voter_test.bench.with_wallet().await;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;
    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    for _ in 0..5 {
        let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
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
async fn test_leaf_verification() -> Result<(), TransportError> {
    let mut nft_voter_test = NftVoterTest::start_new().await;
    let max_depth = 5;
    let max_buffer_size = 8;
    let voter_cookie = nft_voter_test.bench.with_wallet().await;
    let cnft_collection_cookie = nft_voter_test.token_metadata.with_nft_collection(Some(10)).await?;
    let mut tree_cookie = nft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let leaf_cookie = nft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie,
        &mut tree_cookie,
        &voter_cookie
    ).await?;

    let root = nft_voter_test.merkle_tree.decode_root(
        &tree_cookie.address,
        max_depth,
        max_buffer_size
    ).await?;
    assert_eq!(Pubkey::from(root), Pubkey::from(tree_cookie.proof_tree.get_root()));

    let (leaf_verification_cookie, proofs, asset_id) =
        nft_voter_test.merkle_tree.get_leaf_verification_info(
            &mut tree_cookie,
            &leaf_cookie,
            max_depth,
            max_buffer_size
        ).await?;

    assert!(leaf_cookie.asset_id == asset_id);
    assert!(leaf_verification_cookie.root != [0u8; 32]);
    assert!(leaf_verification_cookie.index == leaf_cookie.index);
    assert!(proofs.len() == max_depth - (tree_cookie.canopy_depth as usize));

    nft_voter_test.with_cnft_verification(
        &voter_cookie,
        &leaf_cookie,
        &leaf_verification_cookie,
        &proofs
    ).await?;
    Ok(())
}
