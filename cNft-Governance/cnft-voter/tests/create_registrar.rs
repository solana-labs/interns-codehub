mod program_test;

use anchor_lang::prelude::{ErrorCode, Pubkey};
use cnft_voter::error::CompressedNftVoterError;
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


// #[tokio::test]
// async fn test_create_registrar_with_invalid_realm_authority_error() -> Result<(), TransportError> {
//     // Arrange
//     let mut cnft_voter_test = CompressedNftVoterTest::start_new().await;

//     let mut realm_cookie = cnft_voter_test.governance.with_realm().await?;
//     realm_cookie.realm_authority = Keypair::new();

//     // Act
//     let err = cnft_voter_test
//         .with_registrar(&realm_cookie)
//         .await
//         .err()
//         .unwrap();

//     assert_cnft_voter_err(err, CompressedNftVoterError::InvalidRealmAuthority);

//     Ok(())
// }
