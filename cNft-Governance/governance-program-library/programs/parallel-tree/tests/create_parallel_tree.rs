use anchor_lang::prelude::Pubkey;
use spl_parallel_tree::error::ParallelTreeError;
use program_test::parallel_tree_test::*;
use solana_program_test::*;
use solana_sdk::transport::TransportError;
use crate::program_test::tools::assert_parallel_tree_err;
mod program_test;

#[tokio::test]
async fn test_create_parallel_tree() -> Result<(), TransportError> {
    let mut parallel_tree_test = ParallelTreeTest::start_new().await;

    let wallet_cookie = parallel_tree_test.bench.with_wallet().await;
    let tree_cookie = parallel_tree_test.merkle_tree.with_merkle_tree(&wallet_cookie, None).await?;

    let parallel_tree_cookie = parallel_tree_test.with_create_parallel_tree(
        &tree_cookie,
        &wallet_cookie
    ).await?;

    parallel_tree_test.bench.advance_clock().await;

    let merkle_tree_header = parallel_tree_test.merkle_tree.get_tree_header_account(
        &tree_cookie.address
    ).await;
    let parallel_tree_header = parallel_tree_test.get_tree_header_account(
        &parallel_tree_cookie.address
    ).await;

    assert_eq!(merkle_tree_header.get_max_depth(), parallel_tree_header.get_max_depth());
    assert_eq!(
        merkle_tree_header.get_max_buffer_size(),
        parallel_tree_header.get_max_buffer_size()
    );

    Ok(())
}

#[tokio::test]
async fn test_create_parallel_tree_with_invalid_creator() -> Result<(), TransportError> {
    let mut parallel_tree_test = ParallelTreeTest::start_new().await;

    let wallet_cookie = parallel_tree_test.bench.with_wallet().await;
    let tree_cookie = parallel_tree_test.merkle_tree.with_merkle_tree(&wallet_cookie, None).await?;

    parallel_tree_test.bench.advance_clock().await;

    let wallet_cookie2 = parallel_tree_test.bench.with_wallet().await;
    let err = parallel_tree_test
        .with_create_parallel_tree(&tree_cookie, &wallet_cookie2).await
        .err()
        .unwrap();

    assert_parallel_tree_err(err, ParallelTreeError::InvalidParallelTreeCreator);
    Ok(())
}

#[tokio::test]
async fn test_create_parallel_tree_with_invalid_seeds() -> Result<(), TransportError> {
    let mut parallel_tree_test = ParallelTreeTest::start_new().await;

    let wallet_cookie = parallel_tree_test.bench.with_wallet().await;
    let tree_cookie = parallel_tree_test.merkle_tree.with_merkle_tree(&wallet_cookie, None).await?;

    let parallel_tree_key = Pubkey::find_program_address(
        &[b"mpl_bubblegum", tree_cookie.address.as_ref()],
        &spl_parallel_tree::id()
    ).0;
    let (parallel_tree_authority, _) = Pubkey::find_program_address(
        &[parallel_tree_key.as_ref()],
        &spl_parallel_tree::id()
    );

    let err = parallel_tree_test
        .with_create_parallel_tree_ix(
            &tree_cookie,
            &wallet_cookie,
            |i| {
                i.accounts[0].pubkey = parallel_tree_authority;
                i.accounts[1].pubkey = parallel_tree_key;
            },
            None
        ).await
        .err();

    if let Some(_) = err {
        Ok(())
    } else {
        panic!("Expected error");
    }
}

// #[tokio::test]
// async fn test_create_parallel_tree_with_already_created() -> Result<(), TransportError> {
//     let mut parallel_tree_test = ParallelTreeTest::start_new().await;

//     let wallet_cookie = parallel_tree_test.bench.with_wallet().await;
//     let tree_cookie = parallel_tree_test.merkle_tree.with_merkle_tree(&wallet_cookie, None).await?;

//     parallel_tree_test.with_create_parallel_tree(&tree_cookie, &wallet_cookie).await?;

//     parallel_tree_test.bench.advance_clock().await;
//     let parallel_tree_key = get_parallel_tree_address(&tree_cookie.address);
//     let tree_data = parallel_tree_test.get_tree_account(&parallel_tree_key).await;
//     assert_eq!(tree_data.is_empty(), false);

//     let authority_key = get_authority_address(&parallel_tree_key);
//     let authority_data = parallel_tree_test.get_tree_authority_account(&authority_key).await;
//     assert_eq!(authority_data.tree_creator, wallet_cookie.address);

//     let err = parallel_tree_test
//         .with_create_parallel_tree(&tree_cookie, &wallet_cookie).await
//         .err()
//         .unwrap();

//     assert_parallel_tree_err(err, ParallelTreeError::ConcurrentMerkleTreeDataNotEmpty);
//     Ok(())
// }
