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
async fn test_get_leaf_verification_info() -> Result<(), TransportError> {
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
    let leaf_verification_cookie = cnft_voter_test.merkle_tree.get_leaf_verification_info(
        &mut tree_cookie, 
        &leaf_cookie, 
        5,
        8
    ).await?;

    assert!(leaf_verification_cookie.root != [0u8; 32]);
    assert!(leaf_verification_cookie.data_hash != [0u8; 32]);
    assert!(leaf_verification_cookie.creator_hash != [0u8; 32]);
    assert!(leaf_verification_cookie.nonce == nonce);
    assert!(leaf_verification_cookie.index == leaf_cookie.index);
    assert!(leaf_verification_cookie.proofs.len() > 0);
    // verify compressed nft
    // let verified = cnft_voter_test.token_metadata.verify_compressed_nft(&cnft_collection_cookie, &tree_cookie, &leaf_cookie).await?;
    // assert!(verified);
    Ok(())
}

// #[allow(dead_code)]
// pub async fn verify_nft_collection_owner(
//     &self,
//     tree_cookie: &mut MerkleTreeCookie,
//     leaf_verification_cookie: &LeafVerificationCookie,
//     leaf_owner: &Pubkey,
//     leaf_delegate: &Pubkey,
// ) -> Result<(), TransportError>{
//     let tree_mint = &tree_cookie.address;
//     let root = leaf_verification_cookie.root;
//     let data_hash = leaf_verification_cookie.data_hash;
//     let creator_hash = leaf_verification_cookie.creator_hash;
//     let nonce = leaf_verification_cookie.nonce;
//     let index = leaf_verification_cookie.index;
//     let metadata = &leaf_verification_cookie.message;
//     let proofs = &leaf_verification_cookie.proofs;
//     let asset_id = get_asset_id(tree_mint, nonce);

//     let data_hash_test = hash_metadata(metadata).unwrap();
//     assert_eq!(data_hash, data_hash_test);


//     let leaf = LeafSchema::new_v0(
//         asset_id, 
//         *leaf_owner, 
//         *leaf_delegate,
//         nonce,
//         data_hash, 
//         creator_hash
//     );

//     let cpi_ctx = CpiContext::new(
//         spl_account_compressio,
//         VerifyLeaf {
//             merkle_tree: merkle_tree.clone(),
//         },
//     )
//     .with_remaining_accounts(proofs);

//     spl_account_compression::cpi::verify_leaf(cpi_ctx, params.root, leaf.to_node(), params.index)?;

//     Ok(())
// }