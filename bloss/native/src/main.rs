use {
    byteorder::{ReadBytesExt, NativeEndian, WriteBytesExt},
    openpgp_card::{
        Error as OpenpgpCardError,
        SmartcardError as SmartcardError,
    },
    openpgp_card_pcsc::PcscBackend,
    bloss_native::card::{CardErrorWrapper, OpenpgpCard, OpenpgpCardInfo},
    serde::{Serialize, Deserialize},
    std::{
        error::Error,
        io::{self, Read, Write},
        num::TryFromIntError,
    },
    thiserror::Error,
};

#[derive(Serialize, Deserialize, Debug)]
struct PcscHostRequest {
    command: PcscHostCommand,
}

#[derive(Serialize, Deserialize, Debug)]
enum PcscHostCommand {
    ListCards,
    GetPubkey {
        aid: String,
    },
    SignMessage {
        aid: String,
        message: Vec<u8>,
        pin: Vec<u8>,
    },
}

#[derive(Serialize, Deserialize, Debug)]
enum PcscHostResponse {
    Ok(ResponseData),
    Error(ErrorData),
}

#[derive(Serialize, Deserialize, Debug)]
enum ResponseData {
    ListCards(Vec<OpenpgpCardInfo>),
    GetPubkey {
        aid: String,
        pubkey: Vec<u8>,
    },
    SignMessage {
        aid: String,
        signature: Vec<u8>,
    },
    AwaitTouch {
        aid: String,
    },
}

#[derive(Serialize, Deserialize, Debug)]
struct ErrorData {
    aid: Option<String>,
    details: CardErrorWrapper,
}

impl PcscHostRequest {
    fn handle(&self) -> PcscHostResponse {
        match &self.command {
            PcscHostCommand::ListCards => {
                eprint!("LIST CARDS...");
                match list_cards() {
                    Ok(cards) => {
                        eprintln!("Ok");
                        PcscHostResponse::Ok(ResponseData::ListCards(cards))
                    },
                    Err(e) => {
                        eprintln!("Error: {e}");
                        PcscHostResponse::Error( ErrorData { aid: None, details: e } )
                    },
                }
            },
            PcscHostCommand::GetPubkey { aid } => {
                eprint!("GET PUBKEY...");
                match get_pubkey(aid) {
                    Ok(pubkey) => {
                        eprintln!("Ok");
                        PcscHostResponse::Ok(ResponseData::GetPubkey {
                            aid: aid.to_string(),
                            pubkey
                        })
                    },
                    Err(e) => {
                        eprintln!("Error: {e}");
                        PcscHostResponse::Error( ErrorData { aid: Some(aid.to_string()), details: e } )
                    },
                }
            },
            PcscHostCommand::SignMessage { aid, message, pin } => {
                eprint!("SIGN DATA...");
                match sign_message(aid, message, pin) {
                    Ok(signature) => {
                        eprintln!("Ok");
                        PcscHostResponse::Ok(ResponseData::SignMessage {
                            aid: aid.to_string(),
                            signature
                        })
                    },
                    Err(e) => {
                        eprintln!("Error: {e}");
                        PcscHostResponse::Error( ErrorData { aid: Some(aid.to_string()), details: e } )
                    },
                }
            },
        }
    }
}

fn write_touch_notification(aid: &String) {
    eprintln!("Awaiting touch confirmation...");
    let response = PcscHostResponse::Ok(ResponseData::AwaitTouch {
        aid: aid.to_string(),
    });
    write_response(&response).unwrap();
}

fn list_cards() -> Result<Vec<OpenpgpCardInfo>, CardErrorWrapper> {
    let card_results = PcscBackend::cards(None);
    let backends = match card_results {
        Ok(b) => b,
        Err(OpenpgpCardError::Smartcard(SmartcardError::NoReaderFoundError)) => Vec::new(),
        Err(e) => return Err(CardErrorWrapper::InternalError(e.to_string())),
    };
    let mut cards = Vec::<OpenpgpCardInfo>::new();
    for backend in backends {
        let card = OpenpgpCard::from(backend);
        cards.push(card.get_info()?);
    }
    Ok(cards)
}

fn get_pubkey(aid: &String) -> Result<Vec<u8>, CardErrorWrapper> {
    let card = OpenpgpCard::try_from(aid)?;
    let pubkey = card.get_pubkey()?;
    Ok(pubkey)
}

fn sign_message(aid: &String, message: &Vec<u8>, pin: &Vec<u8>) -> Result<Vec<u8>, CardErrorWrapper> {
    let card = OpenpgpCard::try_from(aid)?;
    let signature = card.sign_message(
        &message.as_slice(),
        pin.as_slice(),
        || write_touch_notification(aid),
    )?;
    Ok(signature)
}

#[derive(Debug, Error)]
enum ReadRequestError {
    #[error("end of input reached")]
    EndOfInput,
    #[error(transparent)]
    IoError(#[from] io::Error),
    #[error(transparent)]
    TryFromIntError(#[from] TryFromIntError),
    #[error(transparent)]
    SerdeError(#[from] serde_json::Error),
}

fn read_header() -> Result<u32, io::Error> {
    let header = io::stdin().read_u32::<NativeEndian>()?;
    eprintln!("READ HEADER");
    Ok(header)
}

fn read_request() -> Result<PcscHostRequest, ReadRequestError> {
    let msg_len = read_header().map_err(|_| ReadRequestError::EndOfInput)?;
    let mut buf = vec![0u8; msg_len.try_into()?];
    io::stdin().read_exact(&mut buf)?;
    let v: PcscHostRequest = serde_json::from_slice(buf.as_slice())?;
    eprintln!("READ REQUEST");
    Ok(v)
}

fn write_header(msg_len: u32) -> Result<(), io::Error> {
    io::stdout().write_u32::<NativeEndian>(msg_len)?;
    eprintln!("WRITE HEADER");
    Ok(())
}

fn write_response(resp: &PcscHostResponse) -> Result<(), Box<dyn Error>> {
    let resp_string = serde_json::to_string(&resp)?;
    let resp_bytes = resp_string.as_bytes();
    let msg_len = resp_bytes.len();
    write_header(msg_len as u32)?;

    let bytes_written = io::stdout().write(&resp_bytes)?;
    assert_eq!(bytes_written, msg_len);

    io::stdout().flush()?;
    eprintln!("WRITE RESPONSE");
    Ok(())
}

fn main() -> Result<(), Box<dyn Error>> {
    eprintln!("START NATIVE HOST");
    loop {
        eprintln!("----------------------------------------");
        eprintln!("BEGIN CMD");
        let request = match read_request() {
            Ok(req) => req,
            Err(ReadRequestError::EndOfInput) => {
                eprintln!("TERMINATE NATIVE HOST");
                return Ok(());
            },
            Err(e) => return Err(Box::new(e))
        };
        eprintln!("START HANDLING");
        let response = request.handle();
        eprintln!("DONE HANDLING");
        write_response(&response)?;
        eprintln!("END CMD");
    }
}
