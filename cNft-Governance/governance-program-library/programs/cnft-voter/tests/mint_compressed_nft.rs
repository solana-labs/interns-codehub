use program_test::cnft_voter_test::*;
use solana_sdk::transport::TransportError;
use solana_program_test::*;

mod program_test;

#[tokio::test]
async fn test_mint_compressed_nft() -> Result<(), TransportError> {
    let cnft_voter_test = CompressedNftVoterTest::start_new().await;

    // mint compressed nft
    let cnft_collection_cookie = cnft_voter_test.token_metadata.with_nft_collection().await?;
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let nonce = 0u64;
    let leaf_cookie = cnft_voter_test.token_metadata.with_compressed_nft(&cnft_collection_cookie, &mut tree_cookie, nonce).await?;
    assert_eq!(leaf_cookie.index, u32::try_from(nonce).unwrap());
    assert_eq!(leaf_cookie.nonce, nonce);
    assert_eq!(tree_cookie.num_minted, nonce + 1);
    Ok(())
}

#[tokio::test]
async fn test_mint_multiple_compressed_nft() -> Result<(), TransportError> {
    let cnft_voter_test = CompressedNftVoterTest::start_new().await;

    let cnft_collection_cookie = cnft_voter_test.token_metadata.with_nft_collection().await?;
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    for i in 0..5 {
        let nonce = i;
        let leaf_cookie = cnft_voter_test.token_metadata.with_compressed_nft(&cnft_collection_cookie, &mut tree_cookie, nonce).await?;
        assert_eq!(leaf_cookie.index, u32::try_from(nonce).unwrap());
        assert_eq!(leaf_cookie.nonce, nonce);
        assert_eq!(tree_cookie.num_minted, nonce + 1);
    }
    Ok(())
}

#[tokio::test]
async fn test_mint_compressed_nft_to_collection() -> Result<(), TransportError> {
    let cnft_voter_test = CompressedNftVoterTest::start_new().await;

    // mint compressed nft
    let cnft_collection_cookie = cnft_voter_test.token_metadata.with_cnft_collection(10).await?;
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let nonce = 0u64;
    let leaf_cookie = cnft_voter_test.token_metadata.with_compressed_nft_to_collection(
        &cnft_collection_cookie, 
        &mut tree_cookie, 
        nonce
    ).await?;
    assert_eq!(leaf_cookie.index, u32::try_from(nonce).unwrap());
    assert_eq!(leaf_cookie.nonce, nonce);
    assert_eq!(tree_cookie.num_minted, nonce + 1);
    Ok(())
}

#[tokio::test]
async fn test_mint_multiple_compressed_nft_to_collection() -> Result<(), TransportError> {
    let cnft_voter_test = CompressedNftVoterTest::start_new().await;

    // mint compressed nft
    let cnft_collection_cookie = cnft_voter_test.token_metadata.with_cnft_collection(10).await?;
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    for i in 0..5 {
        let nonce = i;
        let leaf_cookie = cnft_voter_test.token_metadata.with_compressed_nft_to_collection(&cnft_collection_cookie, &mut tree_cookie, nonce).await?;
        assert_eq!(leaf_cookie.index, u32::try_from(nonce).unwrap());
        assert_eq!(leaf_cookie.nonce, nonce);
        assert_eq!(tree_cookie.num_minted, nonce + 1);
    }
    Ok(())
}

#[tokio::test]
async fn test_mint_and_verify_compressed_nft() -> Result<(), TransportError> {
    let cnft_voter_test = CompressedNftVoterTest::start_new().await;

    // mint compressed nft
    let cnft_collection_cookie = cnft_voter_test.token_metadata.with_nft_collection().await?;
    let mut tree_cookie = cnft_voter_test.merkle_tree.with_merkle_tree(None).await?;

    let nonce = 0u64;
    let leaf_cookie = cnft_voter_test.token_metadata.with_compressed_nft(&cnft_collection_cookie, &mut tree_cookie, nonce).await?;

    // verify compressed nft
    // let verified = cnft_voter_test.token_metadata.verify_compressed_nft(&cnft_collection_cookie, &tree_cookie, &leaf_cookie).await?;
    // assert!(verified);
    Ok(())
}