use anchor_lang::prelude::ErrorCode;
use program_test::cnft_voter_test::CompressedNftVoterTest;
use program_test::tools::{assert_anchor_err, assert_ix_err};
use solana_program::instruction::InstructionError;
use solana_program_test::*;
use solana_sdk::transport::TransportError;

mod program_test;

#[tokio::test]
async fn test_create_voter_weight_record() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let voter_cookie = cnft_voter_test.bench.with_wallet().await;

    let voter_weight_record_cookie = cnft_voter_test
        .with_voter_weight_record(&registrar_cookie, &voter_cookie)
        .await?;

    let voter_weight_record = cnft_voter_test
        .get_voter_weight_record(&voter_weight_record_cookie.address)
        .await;

    println!("Max Voter Weight Record: {:?}", voter_weight_record);
    println!("Max Voter Weight Record Cookie: {:?}", voter_weight_record_cookie.account);
    assert_eq!(
        voter_weight_record_cookie.account,
        voter_weight_record
    );

    Ok(())
}

#[tokio::test]
async fn test_create_voter_weight_record_with_invalid_realm_error() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let realm_cookie2 = cnft_voter_test.governance.with_realm().await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;

    let err = cnft_voter_test
        .with_voter_weight_record_using_ix(
            &registrar_cookie,
            &voter_cookie,
            |i| i.accounts[2].pubkey = realm_cookie2.address,
        )
        .await
        .err()
        .unwrap();

    assert_anchor_err(err, ErrorCode::ConstraintSeeds);
    Ok(())
}

#[tokio::test]
async fn test_create_voter_weight_record_with_invalid_mint_error() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let mint_cookie = cnft_voter_test.bench.with_mint().await?;

    let voter_cookie = cnft_voter_test.bench.with_wallet().await;

    let err = cnft_voter_test.with_voter_weight_record_using_ix(
        &registrar_cookie,
        &voter_cookie,
        |i| i.accounts[3].pubkey = mint_cookie.address,
    ).await.err().unwrap();

    assert_anchor_err(err, ErrorCode::ConstraintSeeds);
    Ok(())
}

#[tokio::test]
async fn test_create_voter_weight_record_with_already_exists_error(
) -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    let voter_cookie = cnft_voter_test.bench.with_wallet().await;

    cnft_voter_test
        .with_voter_weight_record(&registrar_cookie, &voter_cookie)
        .await?;

    // shit to 2 blocks in future
    cnft_voter_test.bench.advance_clock().await;

    let err = cnft_voter_test
        .with_voter_weight_record(&registrar_cookie, &voter_cookie)
        .await
        .err()
        .unwrap();

    // InstructionError::Custom(0) is returned for TransactionError::AccountInUse
    assert_ix_err(err, InstructionError::Custom(0));

    Ok(())
}
