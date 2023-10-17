import {
  Cluster,
  ConfirmOptions,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmRawTransaction,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { message } from "antd";
import bs58 from "bs58";
import { generateAvatar } from "./avatar";
import {
  KeypairSigner,
  KryptonAccount,
  Signer,
  YubikeySigner,
} from "../types/account";
import { GlobalModalContext } from "../components/GlobalModal";
import PinentryModal from "../components/GlobalModal/PinentryModal";
import TouchConfirmModal from "../components/GlobalModal/TouchConfirmModal";
import { PDA_RENT_EXEMPT_FEE, RPC_URL, WALLET_PROGRAM_ID } from "./constants";
const BN = require("bn.js");

// implement a function that gets an account's balance
const refreshBalance = async (
  network: Cluster | undefined,
  publicKey: PublicKey | null
) => {
  // This line ensures the function returns before running if no account has been set
  if (!publicKey) return 0;

  try {
    const connection = new Connection(RPC_URL(network), "confirmed");
    const profile_pda = getProfilePDA(publicKey);
    const balance = await connection.getBalance(profile_pda[0]);
    if (balance - PDA_RENT_EXEMPT_FEE <= 0) return 0;
    return (balance - PDA_RENT_EXEMPT_FEE) / LAMPORTS_PER_SOL;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown Error";
    message.error(`Balance refresh failed: ${errorMessage}`);
    return 0;
  }
};

// implement a function that airdrops SOL into devnet account
const handleAirdrop = async (network: Cluster, publicKey: PublicKey | null) => {
  // This line ensures the function returns before running if no account has been set
  if (!publicKey) return;

  try {
    const connection = new Connection(RPC_URL(network), "confirmed");
    const profile_pda = getProfilePDA(publicKey);
    const confirmation = await connection.requestAirdrop(
      profile_pda[0],
      LAMPORTS_PER_SOL
    );
    const recentBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction(
      {
        blockhash: recentBlockhash.blockhash,
        lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
        signature: confirmation,
      },
      "confirmed"
    );
    const balance = await refreshBalance(network, publicKey);
    return balance;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown Error";
    message.error(`Airdrop failed: ${errorMessage}`);
  }
};

const isNumber = (value: string | number) => {
  return value != null && value !== "" && !isNaN(Number(value.toString()));
};

const displayAddress = (address: string) =>
  `${address.slice(0, 4)}...${address.slice(-4)}`;

const containsPk = (obj: string, list: Array<PublicKey>) => {
  for (let i = 0; i < list.length; i++) {
    console.log("list item: ", list[i].toBase58());
    console.log("obj: ", obj);
    if (list[i].toBase58() === obj) {
      return true;
    }
  }
  return false;
};

/*
 * Sign transaction with the given account.
 * Also use that account as the fee payer.
 * Then send and confirm the signed transaction.
 */
const sendAndConfirmTransactionWithAccount = async (
  connection: Connection,
  transaction: Transaction,
  signers: Signer[],
  options?: ConfirmOptions &
    Readonly<{
      abortSignal?: AbortSignal;
    }>
) => {
  const transactionBuffer = transaction.serializeMessage();

  for (const signer of signers) {
    const signature = await signer.signMessage(transactionBuffer);
    transaction.addSignature(
      await signer.getPublicKey(),
      Buffer.from(signature)
    );
  }
  const finalSignature = bs58.encode(new Uint8Array(transaction.signature!));

  // TODO: Add assert or other error checking for this
  const isVerifiedSignature = transaction.verifySignatures();
  console.log(`The signatures were verified: ${isVerifiedSignature}`);

  const rawTransaction = transaction.serialize();
  const latestBlockHash = await connection.getLatestBlockhash();
  const txid = await sendAndConfirmRawTransaction(
    connection,
    rawTransaction,
    {
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: finalSignature,
    },
    options
  );

  if (txid != finalSignature) {
    console.log("SOMETHING WRONG: TXID != SIGNATURE!!!!!!!!!!!");
    console.log(txid);
    console.log(finalSignature);
  }

  return txid;
};

const partialSign = async (
  tx: Transaction | VersionedTransaction,
  signer: Signer
) => {
  let transactionBuffer;
  if (typeof (tx as any).serializeMessage === "function") {
    transactionBuffer = (tx as any).serializeMessage();
  } else {
    transactionBuffer = (tx as any).message.serialize();
  }
  const signature = await signer.signMessage(transactionBuffer);
  tx.addSignature(await signer.getPublicKey(), Buffer.from(signature));
};

const getProfilePDA = (feePayerPK: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("profile", "utf-8"), feePayerPK.toBuffer()],
    WALLET_PROGRAM_ID
  );
};

const getAccountFromPkString = async (
  pk: string,
  context: GlobalModalContext
) => {
  let account: KryptonAccount | undefined;
  await chrome.storage.local
    .get(["mode", "accounts", "y_accounts"])
    .then((result) => {
      // standard
      if (result.mode === 0) {
        const accountObj = JSON.parse(result["accounts"]);
        console.log("desired: ", pk);
        const res: any = Object.values(accountObj).find(
          (obj: any) => obj.pk === pk
        );
        console.log("actual: ", res["pk"]);
        if (!res) {
          console.log("Standard keypair not found");
          return result;
        }
        console.log("Standard keypair FOUND!");
        const newKeypair = Keypair.fromSecretKey(bs58.decode(res.sk));
        const signer = new KeypairSigner(newKeypair);
        const pda = getProfilePDA(new PublicKey(pk));
        if (pda[0].toBase58() != res.pda) {
          console.log("pda's don't match");
        }
        account = {
          name: res.name,
          pk: pk,
          pda: pda[0].toBase58(),
          ...signer,
          getPublicKey: signer.getPublicKey,
          signMessage: signer.signMessage,
          ...(res.avatar && { avatar: res.avatar }),
        };
      }

      // yubikey
      // TODO: Detoxify this
      else if (result.mode === 1) {
        const accountObj = JSON.parse(result["y_accounts"]);
        console.log("desired: ", pk);
        const res: any = Object.values(accountObj).find(
          (obj: any) => obj.pk === pk
        );
        console.log("actual: ", res["pk"]);
        if (!res) {
          console.log("Yubikey keypair not found");
          return result;
        }
        const tmpKeypair = new YubikeySigner(
          res["aid"],
          (isRetry: boolean) => {
            const promise = new Promise<string>((resolve, reject) => {
              context.showModal(
                <PinentryModal
                  title={"Please unlock your YubiKey"}
                  isRetry={isRetry}
                  onSubmitPin={(pin: string) => {
                    context.hideModal();
                    resolve(pin);
                  }}
                  onCancel={() => {
                    context.hideModal();
                    reject("User cancelled");
                  }}
                ></PinentryModal>
              );
            });
            return promise;
          },
          () => {
            context.showModal(
              <TouchConfirmModal
                onCancel={() => {
                  context.hideModal();
                  console.log("User cancelled touch");
                }}
              ></TouchConfirmModal>
            );
          },
          context.hideModal
        );
        console.log("Yubikey keypair FOUND!");
        const pda = getProfilePDA(new PublicKey(pk));
        if (pda[0].toBase58() != res.pda) {
          console.log("pda's don't match");
        }
        account = {
          name: res.name,
          pk: pk,
          pda: pda[0].toBase58(),
          ...(res.avatar && { avatar: res.avatar }),
          manufacturer: res.manufacturer,
          ...tmpKeypair,
          getPublicKey: tmpKeypair.getPublicKey,
          signMessage: tmpKeypair.signMessage,
        };
      }
    });
  console.log(account);
  return account;
};

const getCurrentAccount = async (context: GlobalModalContext) => {
  let account: KryptonAccount | undefined;
  await chrome.storage.local
    .get(["currId", "accounts", "y_accounts", "mode", "y_id"])
    .then((result) => {
      // standard
      if (result.mode === 0) {
        const accountObj = JSON.parse(result["accounts"]);
        const currId = result["currId"];
        const res = accountObj[currId];
        const newKeypair = Keypair.fromSecretKey(bs58.decode(res.sk));
        const signer = new KeypairSigner(newKeypair);
        const pda = getProfilePDA(new PublicKey(res.pk));
        if (pda[0].toBase58() != res.pda) {
          console.log("pda's don't match");
        }
        account = {
          name: res.name,
          pk: res.pk,
          pda: pda[0].toBase58(),
          ...signer,
          getPublicKey: signer.getPublicKey,
          signMessage: signer.signMessage,
          ...(res.avatar && { avatar: res.avatar }),
        };
      }

      // yubikey
      // TODO: Detoxify this
      else if (result.mode === 1) {
        const accountObj = JSON.parse(result["y_accounts"]);
        const y_id = result["y_id"];
        const res = accountObj[y_id];
        console.log(res);
        const tmpKeypair = new YubikeySigner(
          res["aid"],
          (isRetry: boolean) => {
            const promise = new Promise<string>((resolve, reject) => {
              context.showModal(
                <PinentryModal
                  title={"Please unlock your YubiKey"}
                  isRetry={isRetry}
                  onSubmitPin={(pin: string) => {
                    context.hideModal();
                    resolve(pin);
                  }}
                  onCancel={() => {
                    context.hideModal();
                    reject("User cancelled");
                  }}
                ></PinentryModal>
              );
            });
            return promise;
          },
          () => {
            context.showModal(
              <TouchConfirmModal
                onCancel={() => {
                  context.hideModal();
                  console.log("User cancelled touch");
                }}
              ></TouchConfirmModal>
            );
          },
          context.hideModal
        );
        console.log("Yubikey keypair FOUND!");
        const pda = getProfilePDA(new PublicKey(res.pk));
        if (pda[0].toBase58() != res.pda) {
          console.log("pda's don't match");
        }
        account = {
          name: res.name,
          pk: res.pk,
          pda: pda[0].toBase58(),
          ...(res.avatar && { avatar: res.avatar }),
          manufacturer: res.manufacturer,
          ...tmpKeypair,
          getPublicKey: tmpKeypair.getPublicKey,
          signMessage: tmpKeypair.signMessage,
        };
      }
    });
  console.log(account);
  return account;
};

const parsePubkey = (rawPubkey: any) => {
  const num = new BN(0);
  num.words = rawPubkey._bn.words;
  num.length = rawPubkey._bn.length;
  num.red = rawPubkey._bn.red;
  num.negative = rawPubkey._bn.negative;
  return new PublicKey(num);
};

const JSONtoUInt8Array = (obj: any) => {
  const tmpArray = [];
  for (var key in obj) {
    tmpArray.push(obj[key]);
  }
  return new Uint8Array(tmpArray);
};

export {
  refreshBalance,
  handleAirdrop,
  isNumber,
  displayAddress,
  containsPk,
  sendAndConfirmTransactionWithAccount,
  partialSign,
  getProfilePDA,
  getAccountFromPkString,
  getCurrentAccount,
  generateAvatar,
  parsePubkey,
  JSONtoUInt8Array,
};
