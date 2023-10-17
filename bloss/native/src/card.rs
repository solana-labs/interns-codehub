use {
    openpgp_card::{
        algorithm::{Algo, Curve},
        card_do::{
            ApplicationIdentifier,
            KeyStatus,
        },
        crypto_data::{EccType, PublicKeyMaterial, Hash},
        Error as OpenpgpCardError,
        KeyType,
        OpenPgp,
        StatusBytes,
    },
    openpgp_card_pcsc::PcscBackend,
    serde::{Serialize, Deserialize},
    std::cell::RefCell,
    thiserror::Error,
};

pub struct OpenpgpCard {
    pgp: RefCell<OpenPgp>,
}

impl From<PcscBackend> for OpenpgpCard {
    fn from(backend: PcscBackend) -> Self {
        let pgp = OpenPgp::new::<PcscBackend>(backend.into());
        Self { pgp: RefCell::new(pgp) }
    }
}

impl TryFrom<&String> for OpenpgpCard {
    type Error = CardErrorWrapper;

    fn try_from(ident: &String) -> Result<Self, Self::Error> {
        if ident.len() != 32 {
            return Err(Self::Error::AIDParseError("OpenPGP AID must be 32-digit hex string".to_string()));
        }
        let mut ident_bytes = Vec::<u8>::new();
        for i in (0..ident.len()).step_by(2) {
            ident_bytes.push(u8::from_str_radix(&ident[i..i + 2], 16).map_err(
                |_| Self::Error::AIDParseError("non-hex character found in identifier".to_string())
            )?);
        }
        let aid = ApplicationIdentifier::try_from(ident_bytes.as_slice()).map_err(
            |e| Self::Error::AIDParseError(e.to_string())
        )?;
        let backend = PcscBackend::open_by_ident(aid.ident().as_str(), None).map_err(
            |_| Self::Error::CardNotFound(ident.to_string())
        )?;
        Ok(backend.into())
    }
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct OpenpgpCardInfo {
    pub manufacturer: String,
    pub serial_number: String,
    pub aid: String,
    pub signing_algo: String,
    pub pubkey_bytes: Vec<u8>,
}

impl OpenpgpCard {
    pub fn get_info(&self) -> Result<OpenpgpCardInfo, CardErrorWrapper> {
        let mut pgp_mut = self.pgp.borrow_mut();
        let opt = &mut pgp_mut.transaction()?;
        let ard = opt.application_related_data()?;
        let aid = ard.application_id()?;

        let mut signing_key_exists = false;
        if let Some(key_info) = ard.key_information()? {
            match key_info.sig_status() {
                KeyStatus::Generated | KeyStatus::Imported => signing_key_exists = true,
                _ => (),
            };
        } else {
            return Err(CardErrorWrapper::InternalError("could not get key information".to_string()));
        }

        let mut signing_algo: String = "null".to_string();
        let mut pubkey = Vec::<u8>::new();
        if signing_key_exists {
            signing_algo = ard.algorithm_attributes(KeyType::Signing)?.to_string();
            let pk_material = opt.public_key(KeyType::Signing)?;
            pubkey = get_pubkey_from_pk_material(pk_material)?;
        }

        Ok(OpenpgpCardInfo {
            manufacturer: aid.manufacturer_name().to_string(),
            serial_number: format!("{:08x}", aid.serial()),
            aid: aid.to_string().replace(" ", ""),
            signing_algo: signing_algo,
            pubkey_bytes: pubkey,
        })
    }

    pub fn get_pubkey(&self) -> Result<Vec<u8>, CardErrorWrapper> {
        let mut pgp_mut = self.pgp.borrow_mut();
        let opt = &mut pgp_mut.transaction()?;
        let ard = opt.application_related_data()?;

        let mut signing_key_exists = false;
        if let Some(key_info) = ard.key_information()? {
            match key_info.sig_status() {
                KeyStatus::Generated | KeyStatus::Imported => signing_key_exists = true,
                _ => (),
            };
        } else {
            return Err(CardErrorWrapper::InternalError("could not get key information".to_string()));
        }

        let mut pubkey = Vec::<u8>::new();
        if signing_key_exists {
            let pk_material = opt.public_key(KeyType::Signing)?;
            pubkey = get_pubkey_from_pk_material(pk_material)?;
        }

        Ok(pubkey)
    }

    pub fn sign_message<T>(
        &self,
        message: &[u8],
        pin: &[u8],
        touch_confirm_callback: T,
    ) -> Result<Vec<u8>, CardErrorWrapper>
    where T: Fn() -> () {
        let mut pgp_mut = self.pgp.borrow_mut();
        let opt = &mut pgp_mut.transaction()?;

        // Check if signing key exists
        let ard = opt.application_related_data()?;
        if let Some(key_info) = ard.key_information()? {
            match key_info.sig_status() {
                KeyStatus::NotPresent | KeyStatus::Unknown(_) => return Err(CardErrorWrapper::SigningKeyNotFound),
                _ => (),
            };
        } else {
            return Err(CardErrorWrapper::InternalError("could not get key information".to_string()));
        }

        opt.verify_pw1_sign(pin).map_err(
            |e| match e {
                OpenpgpCardError::CardStatus(StatusBytes::IncorrectParametersCommandDataField) => {
                    CardErrorWrapper::InvalidPin
                },
                _ => CardErrorWrapper::from(e),
            }
        )?;

        // Await user touch confirmation if and only if
        //   * Card supports touch confirmation, and
        //   * Touch policy set anything other than "off".
        let ard = opt.application_related_data()?;
        if let Some(signing_uif) = ard.uif_pso_cds()? {
            if signing_uif.touch_policy().touch_required() {
                touch_confirm_callback();
            }
        }

        // Delegate message signing to card
        let hash = Hash::EdDSA(message);
        let sig = opt.signature_for_hash(hash).map_err(
            |e| match e {
                OpenpgpCardError::CardStatus(StatusBytes::SecurityRelatedIssues) => {
                    CardErrorWrapper::TouchConfirmationTimeout
                },
                _ => CardErrorWrapper::from(e),
            }
        )?;

        Ok(sig)
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, Error, PartialEq, Eq)]
pub enum CardErrorWrapper {
    #[error("error parsing AID: {0}")]
    AIDParseError(String),
    #[error("could not find card with AID {0}")]
    CardNotFound(String),
    #[error("internal OpenPGP error: {0}")]
    InternalError(String),
    #[error("no signing key found on card")]
    SigningKeyNotFound,
    #[error("invalid PIN")]
    InvalidPin,
    #[error("touch confirmation timed out")]
    TouchConfirmationTimeout,
}

impl From<OpenpgpCardError> for CardErrorWrapper {
    fn from(e: OpenpgpCardError) -> Self {
        CardErrorWrapper::InternalError(e.to_string())
    }
}

fn get_pubkey_from_pk_material(pk_material: PublicKeyMaterial) -> Result<Vec<u8>, OpenpgpCardError> {
    let pk_bytes: [u8; 32] = match pk_material {
        PublicKeyMaterial::E(pk) => match pk.algo() {
            Algo::Ecc(ecc_attrs) => {
                if ecc_attrs.ecc_type() != EccType::EdDSA || ecc_attrs.curve() != Curve::Ed25519 {
                    return Err(OpenpgpCardError::UnsupportedAlgo(
                        format!("expected Ed25519 key, got {:?}", ecc_attrs.curve())
                    ));
                }
                pk.data().try_into().map_err(
                    |e| OpenpgpCardError::ParseError(format!("key on card is malformed: {}", e))
                )?
            },
            _ => return Err(OpenpgpCardError::UnsupportedAlgo("expected ECC key, got RSA".to_string())),
        }
        _ => return Err(OpenpgpCardError::UnsupportedAlgo("expected ECC key, got RSA".to_string())),
    };
    Ok(pk_bytes.to_vec())
}
