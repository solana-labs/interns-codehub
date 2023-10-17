import EventEmitter from "eventemitter3";
import bs58 from "bs58";
import {
  PublicKey,
  VersionedTransaction,
  VersionedMessage,
  Message,
} from "@solana/web3.js";

export class SolanaProvider extends EventEmitter {
  #publicKey = null;
  #nextRequestId = 1;

  constructor() {
    super();
    this.#publicKey = null;
    this.#nextRequestId = 1;
  }

  get publicKey() {
    return this.#publicKey;
  }

  get isConnected() {
    return this.#publicKey !== null;
  }

  #encodeTransaction = (transaction) => {
    let serialized;
    if (typeof transaction.serializeMessage === "function") {
      serialized = transaction.serializeMessage();
    } else {
      serialized = transaction.message.serialize();
    }
    return bs58.encode(serialized);
  };

  sendMessage = async (message) => {
    return new Promise((resolve, reject) => {
      const listener = (event) => {
        if (event.detail.id === message.id) {
          window.removeEventListener("krypton_contentscript_message", listener);

          if (event.detail.error) {
            reject(event.detail);
          } else {
            resolve(event.detail);
          }
        }
      };
      window.addEventListener("krypton_contentscript_message", listener);

      window.dispatchEvent(
        // eslint-disable-next-line no-undef
        new CustomEvent("krypton_injected_script_message", { detail: message })
      );
    });
  };

  sendRequest = async (method, params) => {
    try {
      return await this.sendMessage({
        jsonrpc: "2.0",
        id: this.#nextRequestId++,
        method,
        params,
      });
    } catch ({ error }) {
      throw new Error(error);
    }
  };

  connect = async (options) => {
    const { method, params } = await this.sendRequest("connect", { options });
    if (method === "connected") {
      this.#publicKey = new PublicKey(params.publicKey);
      return { publicKey: this.#publicKey };
    } else {
      throw new Error("Not connected");
    }
  };

  disconnect = async () => {
    const { method } = await this.sendRequest("disconnect", {});
    if (method === "disconnected") {
      this.#publicKey = null;
    } else {
      throw new Error("Not disconnected");
    }
  };

  signAndSendTransaction = async (transaction, network, options) => {
    const { result } = await this.sendRequest("signAndSendTransaction", {
      message: this.#encodeTransaction(transaction),
      network,
      options,
    });
    return result;
  };

  signTransaction = async (transaction, network) => {
    console.log("========== signTransaction ==============");
    console.log("initial TX: ", transaction);
    console.log(
      "feepayer: ",
      transaction.message.staticAccountKeys.map((ak) => ak.toBase58())
    );
    console.log("signing....");
    const { result } = await this.sendRequest("signTransaction", {
      transaction: transaction,
      message: this.#encodeTransaction(transaction),
      network,
    });
    console.log("signed!");
    console.log("SIGNATUR: ", result.signature);
    console.log("CURR PK: ", result.publicKey);
    console.log("CURR PDA: ", result.pda);

    // Message deserializing
    console.log("CURR msg: ", result.message.data);
    const messageArray = new Uint8Array(result.message.data);
    const message_deserialized = Message.from(messageArray);
    console.log("message deserialized:", message_deserialized);

    // signatures deserializing
    const signaturesArray = [];
    console.log("result signatures: ", result.transaction.signatures);
    for (var key in result.transaction.signatures) {
      const tmpArray2 = [];
      const signature = result.transaction.signatures[key];
      for (var key2 in signature) {
        tmpArray2.push(signature[key2]);
      }
      const signatureArray = new Uint8Array(tmpArray2);
      signaturesArray.push(signatureArray);
    }

    console.log("signatures array: ", signaturesArray);
    const final_parsed = new VersionedTransaction(
      message_deserialized,
      signaturesArray
    );
    console.log("final TX parsed: ", final_parsed);
    // console.log("PDA bytes: ", pda.toBytes())
    // const oldtx_cloned = structuredClone(transaction);
    // console.log("TX before: ", oldtx_cloned)

    // const signerPubkeys = transaction.message.staticAccountKeys.slice(
    //   0,
    //   transaction.message.header.numRequiredSignatures,
    // );
    // const signerIndex = signerPubkeys.findIndex(pubkey =>
    //   pubkey.equals(pda)
    // );
    // console.log("ACCT before: ", transaction.message.staticAccountKeys[signerIndex])
    // console.log("ACCT before bs58: ", transaction.message.staticAccountKeys[signerIndex].toBase58())
    // console.log("SIG before: ", bs58.encode(transaction.signatures[signerIndex]))

    // transaction.message.staticAccountKeys[signerIndex] = publicKey;
    // transaction.signatures[signerIndex] = signature;
    // console.log("ACCT after: ", transaction.message.staticAccountKeys[signerIndex])
    // console.log("ACCT after bs58: ", transaction.message.staticAccountKeys[signerIndex].toBase58())
    // console.log("SIG after: ", transaction.signatures[signerIndex])
    // console.log("SIG after encoded: ", bs58.encode(transaction.signatures[signerIndex]))
    // console.log("TX after: ", transaction)

    // transaction.addSignature(publicKey, signature);
    return final_parsed;
  };

  signAllTransactions = async (transactions, network) => {
    const { result } = await this.sendRequest("signAllTransactions", {
      messages: transactions.map(this.#encodeTransaction),
      network,
    });
    const signatures = result.signatures.map((s) => bs58.decode(s));
    const publicKey = new PublicKey(result.publicKey);
    const pda = new PublicKey(result.pda);
    transactions = transactions.map((tx, idx) => {
      console.log("tx before:", tx);
      console.log("OLD FP: ", tx.feePayer);
      tx.feePayer = pda;
      console.log("NEW FP: ", tx.feePayer);
      // const signerPubkeys = tx._message.staticAccountKeys.slice(
      //   0,
      //   tx._message.header.numRequiredSignatures,
      // );
      // const signerIndex = signerPubkeys.findIndex(pubkey =>
      //   pubkey.equals(pda)
      // );
      // tx._message.staticAccountKeys[signerIndex] = publicKey;
      tx.signatures[signerIndex] = signatures[idx];
      //tx.addSignature(publicKey, signatures[idx]);
      console.log("TX after: ", tx);
      return tx;
    });
    return transactions;
  };

  signMessage = async (message) => {
    if (!(message instanceof Uint8Array)) {
      throw new Error("Data must be an instance of Uint8Array");
    }
    const { result } = await this.sendRequest("sign", { data: message });
    const signature = bs58.decode(result.signature);
    return { signature };
  };

  postMessage = async (message) => {
    try {
      const detail = await this.sendMessage(message);
      window.postMessage(detail);
    } catch (error) {
      window.postMessage(error);
    }
  };
}
