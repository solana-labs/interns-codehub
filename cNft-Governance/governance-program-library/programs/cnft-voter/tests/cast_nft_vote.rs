use program_test::cnft_voter_test::*;
use gpl_cnft_voter::error::CompressedNftVoterError;
use gpl_cnft_voter::state::*;
use solana_sdk::transport::TransportError;
use solana_program_test::*;

mod program_test;

#[tokio::test]
async fn test_cast_nft_vote() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let max_voter_weight_record_cookie = cnft_voter_test.with_max_voter_weight_record(&registrar_cookie).await?;
    let cnft_collection_cookie = cnft_voter_test.token_metadata.with_nft_collection().await?;

    let collection_config_cookie = cnft_voter_test.with_collection(
        &registrar_cookie,
        &cnft_collection_cookie,
        &max_voter_weight_record_cookie,
        Some(ConfigureCollectionArgs { weight: 1, size: 5 })
    ).await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;
    let voter_token_owner_record_cookie = cnft_voter_test.governance.with_token_owner_record(&realm_cookie, &voter_cookie).await?;
    let voter_weight_record_cookie = cnft_voter_test.with_voter_weight_record(&registrar_cookie, &voter_cookie).await?;
    let proposal_cookie = cnft_voter_test.governance.with_proposal(&realm_cookie).await?;

    // mint compressed nft

    cnft_voter_test.bench.advance_clock().await;
    let clock = cnft_voter_test.bench.get_clock().await;
    Ok(())
}