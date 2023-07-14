mod program_test;
use anchor_lang::prelude::{ErrorCode, Pubkey};
use gpl_cnft_voter::error::CompressedNftVoterError;
use program_test::cnft_voter_test::CompressedNftVoterTest;
use solana_program_test::*;
use solana_sdk::{signature::Keypair, transport::TransportError};
use program_test::tools::{assert_anchor_err, assert_cnft_voter_err};

#[tokio::test]
async fn test_create_registrar() -> Result<(), TransportError> {
    // Arrange
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;
    println!("Initialized");

    let realm_cookie = cnft_voter_test.governance.with_realm().await?;
    println!("Realm Cookie");

    // Act
    let registrar_cookie = cnft_voter_test.with_registrar(&realm_cookie).await?;
    println!("Registrar Cookie");

    // Assert
    let registrar = cnft_voter_test
        .get_registrar_account(&registrar_cookie.address)
        .await;
    println!("Registrar Account");

    assert_eq!(registrar, registrar_cookie.account);

    Ok(())
}


#[tokio::test]
async fn test_create_registrar_with_invalid_realm_authority_error() -> Result<(), TransportError> {
    // Arrange
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;

    let mut realm_cookie = cnft_voter_test.governance.with_realm().await?;
    realm_cookie.realm_authority = Keypair::new();

    // Act
    let err = cnft_voter_test
        .with_registrar(&realm_cookie)
        .await
        .err()
        .unwrap();

    assert_cnft_voter_err(err, CompressedNftVoterError::InvalidRealmAuthority);

    Ok(())
}

#[tokio::test]
async fn test_create_registrar_with_invalid_realm_must_sign_error() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;

    let realm_cookie = cnft_voter_test.governance.with_realm().await?;

    let err = cnft_voter_test.with_registrar_using_ix(
        &realm_cookie,
        |i| i.accounts[4].is_signer = false,
        Some(&[]), // no signer is provided
    )
    .await.err().unwrap();

    assert_anchor_err(err, anchor_lang::error::ErrorCode::AccountNotSigner);
    Ok(())
}

#[tokio::test]
async fn test_create_registrar_with_invalid_spl_gov_program_id_error() -> Result<(), TransportError> {
    let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;

    let realm_cookie = cnft_voter_test.governance.with_realm().await?;

    let governance_program_id = cnft_voter_test.program_id;

    let err = cnft_voter_test.with_registrar_using_ix(
        &realm_cookie,
        |i| i.accounts[1].pubkey = governance_program_id,
        None,
    ).await.err().unwrap();

    assert_anchor_err(err, anchor_lang::error::ErrorCode::ConstraintOwner);
    Ok(())

}

#[tokio::test]
async fn test_create_registrar_with_invalid_realm_error() -> Result<(), TransportError> {
    let mut cnft_vote_record = CompressedNftVoterTest::start_new().await;

    let realm_cookie = cnft_vote_record.governance.with_realm().await?;

    let err = cnft_vote_record.with_registrar_using_ix(
        &realm_cookie,
        |i| i.accounts[0].pubkey = Pubkey::new_unique(),
        None,
    ).await.err().unwrap();

    assert_anchor_err(err, ErrorCode::ConstraintSeeds);
    Ok(())
}

#[tokio::test]
async fn test_create_registrar_with_invalid_governing_token_mint_error() -> Result<(), TransportError> {
    let mut cnft_vote_record = CompressedNftVoterTest::start_new().await;

    let realm_cookie = cnft_vote_record.governance.with_realm().await?;

    let mint_cookie = cnft_vote_record.bench.with_mint().await?;

    let err = cnft_vote_record.with_registrar_using_ix(
        &realm_cookie,
        |i| i.accounts[3].pubkey = mint_cookie.address,
        None,
    ).await.err().unwrap();
    
    assert_anchor_err(err, ErrorCode::ConstraintSeeds);

    Ok(())
}