use program_test::parallel_tree_test::*;
use solana_program_test::*;
use solana_sdk::transport::TransportError;
mod program_test;

#[tokio::test]
async fn test_mint_governance_metadata() -> Result<(), TransportError> {
    let mut parallel_tree_test = ParallelTreeTest::start_new().await;

    let wallet_cookie = parallel_tree_test.bench.with_wallet().await;

    // create main tree
    let mut tree_cookie = parallel_tree_test.merkle_tree.with_merkle_tree(
        &wallet_cookie,
        None
    ).await?;
    // create parallel tree
    let parallel_tree_cookie = parallel_tree_test.with_create_parallel_tree(
        &tree_cookie,
        &wallet_cookie
    ).await?;

    // create collection and mint one cNFT to it
    let nft_collection_cookie = parallel_tree_test.token_metadata.with_nft_collection(10).await?;
    let leaf_cookie = parallel_tree_test.token_metadata.with_compressed_nft_to_collection(
        &nft_collection_cookie,
        &mut tree_cookie,
        &wallet_cookie
    ).await?;

    parallel_tree_test.bench.advance_clock().await;

    // get main tree leaf nft data
    let nft_leaf_cookie = parallel_tree_test.merkle_tree.get_compressed_nft(
        &mut tree_cookie,
        leaf_cookie.nonce,
        leaf_cookie.index
    ).await?;

    // get parallel tree corresponding leaf
    let leaf_proof_cookie = parallel_tree_test.get_leaf_proof(
        &parallel_tree_cookie,
        &nft_leaf_cookie
    ).await?;

    // mint governance metadata to parallel tree
    parallel_tree_test.with_mint_governance_metadata(
        &parallel_tree_cookie,
        &nft_leaf_cookie,
        &leaf_proof_cookie,
        &wallet_cookie
    ).await?;
    Ok(())
}
