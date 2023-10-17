import { NextPage } from "next";
import { Keypair } from "@solana/web3.js";
import base58 from "bs58";
import {
  KeypairSigner,
  KryptonAccount,
  StandardAccount,
} from "../types/account";
import SignupForm from "../components/SignupForm";
import { useGlobalState } from "../context";

const Signup: NextPage = () => {
  const { network } = useGlobalState();

  let feePayer = new Keypair();
  if (network == "mainnet-beta") {
    // NOTE: HARDCODED SECRET KEY, REPLACE WITH YOUR OWN SK FOR TESTING ON MAINNET
    let sk = [
      187, 37, 227, 24, 35, 250, 13, 83, 16, 109, 167, 98, 32, 73, 6, 11, 165,
      24, 218, 75, 17, 80, 130, 58, 151, 72, 64, 37, 101, 226, 235, 89, 49, 233,
      57, 40, 204, 188, 220, 117, 247, 186, 47, 158, 61, 62, 138, 240, 74, 100,
      10, 106, 173, 97, 87, 63, 3, 78, 6, 3, 255, 110, 58, 120,
    ].slice(0, 32);
    feePayer = Keypair.fromSeed(Uint8Array.from(sk));
  }
  const feePayerSigner = new KeypairSigner(feePayer);

  const handleStorage = (feePayerAccount: Omit<KryptonAccount, "name">) => {
    chrome.storage.local.get(["counter", "accounts"], (res) => {
      const count = res["counter"];
      const accountRes = res["accounts"];
      if (accountRes != null) {
        const old = JSON.parse(accountRes);
        const account = {
          name: "Account " + count.toString(),
          ...feePayerAccount,
          keypair: feePayer,
        } as StandardAccount;
        old[count] = {
          sk: base58.encode(feePayer.secretKey),
          ...account,
        };
        const values = JSON.stringify(old);
        chrome.storage.local.set({
          accounts: values,
          counter: count + 1,
          currId: count,
          pk: feePayerAccount.pk,
          mode: 0,
        });
      } else {
        return false;
      }
    });
  };

  return (
    // NOTE: if testing with tokens, pass testing info SignupForm
    <SignupForm feePayer={feePayerSigner} handleStorage={handleStorage} testing>
      <h1 className={"title"}>Create New Wallet</h1>
    </SignupForm>
  );
};

export default Signup;
