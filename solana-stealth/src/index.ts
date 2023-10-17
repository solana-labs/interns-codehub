import {
  Connection,
  sendAndConfirmTransaction,
  Transaction,
  SystemProgram,
  PublicKey,
  TransactionInstruction,
  Message,
  AccountMeta,
  sendAndConfirmRawTransaction,
  Signer,
  BlockheightBasedTransactionConfirmationStrategy,
  ConfirmedSignaturesForAddress2Options,
} from '@solana/web3.js';

import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createTransferInstruction,
  transfer,
} from '@solana/spl-token';

import * as ed from '@noble/ed25519';
import * as base58 from 'bs58';
import { randomBytesSeed } from '@csquare/random-bytes-seed';
import { BN } from 'bn.js';
// import { dksap, pubsc, pubsp, privsc, privsp, bytes1 } from "./constants.js";

const dksap = '3iUBKuvbRMPNLeF33QJHYia7ZBNDWqiccy35MXBRQd1f';

/**
 * Class designed to store information when scanning for transactions
 * token will only be set if it is a token transfer
 *
 * @export
 * @class ScanInfo
 */
export class ScanInfo {
  account: string;
  ephem: string;
  token?: string;

  constructor(acct: string, eph: string, tok?: string) {
    this.account = acct;
    this.ephem = eph;
    this.token = tok;
  }
}
/**
 * Public and private keys for stealth accounts
 * Note that private keys are in little endian representations
 * @export
 * @class StealthKeys
 */
export class StealthKeys {
  pubScan: string;
  pubSpend: string;
  privScan: string;
  privSpend: string;
  constructor(pubSc: string, pubSp: string, privSc: string, privSp: string) {
    this.pubScan = pubSc;
    this.pubSpend = pubSp;
    this.privScan = privSp;
    this.privSpend = privSp;
  }
}

function bigIntToHex(bn: BigInt): string {
  let hex: string = bn.toString(16);
  if (hex.length % 2) {
    hex = '0' + hex;
  }
  return hex;
}

/**
 * Generates address to send stealth transaction to
 *
 * @export
 * @param {string} pubScanStr
 * @param {string} pubspendstr
 * @param {string} ephemprivstr should be from a randomly generated keypair, for security
 * @return {*}  {Promise<ed.Point>}
 */
export async function senderGenAddress(
  pubScanStr: string,
  pubspendstr: string,
  ephemprivstr: string,
): Promise<ed.Point> {
  const smth = ed.utils.bytesToHex(base58.decode(pubScanStr));
  const pubScan = ed.Point.fromHex(ed.utils.bytesToHex(base58.decode(pubScanStr)));
  const pubSpend = ed.Point.fromHex(ed.utils.bytesToHex(base58.decode(pubspendstr)));

  const extendedEphem = await ed.utils.getExtendedPublicKey(base58.decode(ephemprivstr));

  const ephempriv = extendedEphem.scalar;

  const dest = await ed.utils.sha512(pubScan.multiply(ephempriv).toRawBytes());

  const a = await ed.utils.getExtendedPublicKey(dest.slice(0, 32));

  return a.point.add(pubSpend);
}

/**
 * Generates scalar key for
 *
 * @export
 * @param {string} privScanStr
 * @param {string} privSpendStr
 * @param {string} ephemStr
 * @return {*}  {Promise<string>}
 */
export async function receiverGenKey(privScanStr: string, privSpendStr: string, ephemStr: string): Promise<string> {
  const ephem = ed.Point.fromHex(ed.utils.bytesToHex(base58.decode(ephemStr)));

  const privScan2 = new BN(base58.decode(privScanStr), 10, 'le');
  const privScan = BigInt(privScan2.toString());
  const privSpend2 = new BN(base58.decode(privSpendStr), 10, 'le');
  const privSpend = BigInt(privSpend2.toString());

  const dest = await ed.utils.sha512(ephem.multiply(privScan).toRawBytes());

  const expac = await ed.utils.getExtendedPublicKey(dest.slice(0, 32));

  let res = expac.scalar + privSpend;

  res = ed.utils.mod(res, ed.CURVE.l);

  const end = new BN(res.toString());
  let reshex = res.toString(16);

  if (reshex.length % 2) {
    reshex = '0' + reshex;
  }
  return base58.encode(end.toArrayLike(Buffer, 'le'));
}
/**
 * Generates potential destination for a transaction
 * Used to detect if transaction was sent towards an individual
 *
 * @export
 * @param {string} privScanStr
 * @param {string} pubSpendStr
 * @param {string} ephemStr
 * @return {*}  {Promise<string>}
 */
export async function receiverGenDest(privScanStr: string, pubSpendStr: string, ephemStr: string): Promise<string> {
  const ephem = ed.Point.fromHex(ed.utils.bytesToHex(base58.decode(ephemStr)));

  const privScan2 = new BN(base58.decode(privScanStr), 10, 'le');
  const privScan = BigInt(privScan2.toString());
  const pubSpendPK = new PublicKey(base58.decode(pubSpendStr));
  const pubSpend = ed.Point.fromHex(ed.utils.bytesToHex(pubSpendPK.toBytes()));

  const dest = await ed.utils.sha512(ephem.multiply(privScan).toRawBytes());

  const expac = await ed.utils.getExtendedPublicKey(dest.slice(0, 32));

  const res = expac.point.add(pubSpend);

  return base58.encode(res.toRawBytes());
}

/**
 * Generate scan and spend keys from signature
 *
 * @export
 * @param {Uint8Array} signature
 * @return {*}  {Promise<string[]>}
 */
export async function genKeys(signature: Uint8Array): Promise<StealthKeys> {
  const hash = await ed.utils.sha512(signature);
  const privsc = await ed.utils.getExtendedPublicKey(hash.slice(0, 32));
  const privscStr = base58.encode(ed.utils.hexToBytes(bigIntToHex(privsc.scalar)));
  const scanScal = new BN(privsc.scalar.toString());
  const scanPub = ed.Point.BASE.multiply(BigInt(scanScal.toString()));
  const privsp = await ed.utils.getExtendedPublicKey(hash.slice(32, 64));
  const privspStr = base58.encode(ed.utils.hexToBytes(bigIntToHex(privsp.scalar)));
  const spendScal = new BN(privsp.scalar.toString());
  const spendPub = ed.Point.BASE.multiply(BigInt(spendScal.toString()));
  const keys: StealthKeys = {
    pubScan: base58.encode(scanPub.toRawBytes()),
    pubSpend: base58.encode(spendPub.toRawBytes()),
    privScan: base58.encode(scanScal.toArrayLike(Buffer, 'le')),
    privSpend: base58.encode(spendScal.toArrayLike(Buffer, 'le')),
  };

  return keys;
}

/**
 * Generates scalar key from user signature of custom string
 *
 * @export
 * @param {Uint8Array} signature
 * @param {string} ephem
 * @return {*}  {Promise<string>}
 */
export async function receiverGenKeyWithSignature(signature: Uint8Array, ephem: string): Promise<string> {
  const keys: StealthKeys = await genKeys(signature);

  return receiverGenKey(keys.privScan, keys.privSpend, ephem);
}

/**
 * Performs signature generation algorithm
 *
 * @param {Message} m
 * @param {string} scalar
 * @param {string} scalar2
 * @return {*}  {Promise<Buffer>}
 */
async function genSignature(m: Message, scalar: string, scalar2: string): Promise<Buffer> {
  const mes = m.serialize();

  const s2buff = base58.decode(scalar2);

  const sc = new BN(base58.decode(scalar), 10, 'le');
  let s = BigInt(sc.toString());

  s = ed.utils.mod(s, ed.CURVE.l);
  const a = ed.Point.BASE.multiply(s);

  const unhashedR: Buffer = Buffer.concat([s2buff, mes]);
  const tempR: Uint8Array = await ed.utils.sha512(unhashedR);

  const rc = new BN(tempR, 10, 'le');
  let r = BigInt(rc.toString());

  r = ed.utils.mod(r, ed.CURVE.l);

  const pointr = ed.Point.BASE.multiply(r);

  const unhashedcombo = Buffer.concat([pointr.toRawBytes(), a.toRawBytes(), mes]);
  const tempcombo = await ed.utils.sha512(unhashedcombo);

  const comb = new BN(tempcombo, 58, 'le');
  let combo = BigInt(comb.toString());

  combo = ed.utils.mod(combo, ed.CURVE.l);

  let bigs = combo * s + r;
  bigs = ed.utils.mod(bigs, ed.CURVE.l);
  const bb = new BN(bigs.toString());

  const sig = Buffer.concat([pointr.toRawBytes(), bb.toArrayLike(Buffer, 'le', 32)]);

  return sig;
}

/**
 * Generates a signature for a message given a stealth address' scalar key
 *
 * @export
 * @param {Message} m
 * @param {string} scalarkey
 * @return {*}  {Promise<Buffer>}
 */
export async function genFullSignature(m: Message, scalarkey: string): Promise<Buffer> {
  const randNum = await genSignature(m, scalarkey, scalarkey);

  const x = randomBytesSeed(32, randNum);

  return genSignature(m, scalarkey, base58.encode(x));
}
/**
 * Signs a transaction given a stealth address' scalar key
 *
 * @export
 * @param {Transaction} tx
 * @param {string} scalarKey
 * @return {*}  {Promise<Transaction>}
 */
export async function signTransaction(tx: Transaction, scalarKey: string): Promise<Transaction> {
  const sc = new BN(base58.decode(scalarKey), 10, 'le'); // base doesn't matter
  const scalar = BigInt(sc.toString());

  const pubkey = ed.Point.BASE.multiply(scalar);

  const sig = await genFullSignature(tx.compileMessage(), scalarKey);
  tx.addSignature(new PublicKey(pubkey.toRawBytes()), sig);
  return tx;
}

/**
 * Create instruction to transfer to a stealth account
 *
 * @export
 * @param {PublicKey} source
 * @param {string} pubScan
 * @param {string} pubSpend
 * @param {number} amount
 * @return {*}  {Promise<TransactionInstruction>}
 */
export async function stealthTransferIx(
  source: PublicKey,
  pubScan: string,
  pubSpend: string,
  amount: number,
): Promise<TransactionInstruction> {
  const eph = ed.utils.randomPrivateKey();

  const dest = await senderGenAddress(pubScan, pubSpend, base58.encode(eph));
  const dksapmeta: AccountMeta = { pubkey: new PublicKey(dksap), isSigner: false, isWritable: false };
  const ephemmeta: AccountMeta = {
    pubkey: new PublicKey(await ed.getPublicKey(eph)),
    isSigner: false,
    isWritable: false,
  };
  const tix = SystemProgram.transfer({
    fromPubkey: source,
    toPubkey: new PublicKey(dest.toRawBytes()),
    lamports: amount,
  });

  tix.keys.push(ephemmeta, dksapmeta);
  return tix;
}
/**
 * sends lamports to a recipient's stealth account
 *
 * @export
 * @param {Connection} connection
 * @param {Signer} source
 * @param {string} pubScan
 * @param {string} pubSpend
 * @param {number} amount  amount in lamports to transfer
 * @return {*}  {Promise<string>} returns result of send and confirm transaction
 */
export async function stealthTransfer(
  connection: Connection,
  source: Signer,
  pubScan: string,
  pubSpend: string,
  amount: number,
): Promise<string> {
  const tix = await stealthTransferIx(source.publicKey, pubScan, pubSpend, amount);
  const tx = new Transaction();
  tx.add(tix);

  const txid = await sendAndConfirmTransaction(connection, tx, [source]);
  return txid;
}

/**
 * Sends tokens to a stealth account
 *
 * @export
 * @param {Connection} connection
 * @param {Signer} source not the token account
 * @param {PublicKey} token
 * @param {string} pubScan
 * @param {string} pubSpend
 * @param {number} amount
 * @return {*}  {Promise<string>}
 */
export async function stealthTokenTransfer(
  connection: Connection,
  source: Signer,
  token: PublicKey,
  pubScan: string,
  pubSpend: string,
  amount: number,
): Promise<string> {
  const tx = await stealthTokenTransferTransaction(source.publicKey,token,pubScan,pubSpend,amount);

  const txid = sendAndConfirmTransaction(connection, tx, [source]);

  return txid;
}

/**
 * Sends tokens to a stealth account
 *
 * @export
 * @param {PublicKey} source not the token account
 * @param {PublicKey} token
 * @param {string} pubScan
 * @param {string} pubSpend
 * @param {number} amount
 * @return {*}  {Promise<Transaction>}
 */
export async function stealthTokenTransferTransaction(
  source: PublicKey,
  token: PublicKey,
  pubScan: string,
  pubSpend: string,
  amount: number,
): Promise<Transaction> {
  const eph = ed.utils.randomPrivateKey();

  const dest = await senderGenAddress(pubScan, pubSpend, base58.encode(eph));
  const destPub = new PublicKey(dest.toRawBytes());
  const dksapmeta: AccountMeta = { pubkey: new PublicKey(dksap), isSigner: false, isWritable: false };
  const ephemmeta: AccountMeta = {
    pubkey: new PublicKey(await ed.getPublicKey(eph)),
    isSigner: false,
    isWritable: false,
  };
  const tokenMeta: AccountMeta = { pubkey: token, isSigner: false, isWritable: false };

  const tokenDest = await getAssociatedTokenAddress(token, destPub);
  const createix = createAssociatedTokenAccountInstruction(source, tokenDest, destPub, token);

  const fromToken = await getAssociatedTokenAddress(token, source);

  const tix = createTransferInstruction(fromToken, tokenDest, source, amount);

  tix.keys.push(ephemmeta, tokenMeta, dksapmeta);

  const tx = new Transaction();
  tx.add(createix).add(tix);

  return tx;
}


/**
 * Sends tokens to a recipient's stealth account
 *
 * @export
 * @param {Connection} connection
 * @param {Signer} payer
 * @param {PublicKey} source
 * @param {PublicKey} token not the associated token account (currently)
 * @param {string} pubScan
 * @param {string} pubSpend
 * @param {Signer} owner
 * @param {number} amount
 * @return {*}  {Promise<string>}
 */
export async function stealthTokenTransfer2(
  connection: Connection,
  payer: Signer,
  source: PublicKey,
  token: PublicKey,
  pubScan: string,
  pubSpend: string,
  owner: Signer,
  amount: number,
): Promise<string> {
  const tx = await stealthTokenTransferTransaction2(payer.publicKey,source,token,pubScan,pubSpend,amount);

  const txid = sendAndConfirmTransaction(connection, tx, [payer, owner]);

  return txid;
}

/**
 * Sends tokens to a recipient's stealth account
 *
 * @export
 * @param {PublicKey} payer
 * @param {PublicKey} source
 * @param {PublicKey} token not the associated token account (currently)
 * @param {string} pubScan
 * @param {string} pubSpend
 * @param {number} amount
 * @return {*}  {Promise<Transaction>}
 */
export async function stealthTokenTransferTransaction2(
  payer: PublicKey,
  source: PublicKey,
  token: PublicKey,
  pubScan: string,
  pubSpend: string,
  amount: number,
): Promise<Transaction> {
  const eph = ed.utils.randomPrivateKey();

  const dest = await senderGenAddress(pubScan, pubSpend, base58.encode(eph));
  const destPub = new PublicKey(dest.toRawBytes());
  const dksapmeta: AccountMeta = { pubkey: new PublicKey(dksap), isSigner: false, isWritable: false };
  const ephemmeta: AccountMeta = {
    pubkey: new PublicKey(await ed.getPublicKey(eph)),
    isSigner: false,
    isWritable: false,
  };
  const tokenMeta: AccountMeta = { pubkey: token, isSigner: false, isWritable: false };

  const tokenDest = await getAssociatedTokenAddress(token, destPub);
  const createix = createAssociatedTokenAccountInstruction(payer, tokenDest, destPub, token);

  const fromToken = await getAssociatedTokenAddress(token, source);

  const tix = createTransferInstruction(fromToken, tokenDest, source, amount);

  tix.keys.push(ephemmeta, tokenMeta, dksapmeta);

  const tx = new Transaction();
  tx.add(createix).add(tix);

  return tx;
}

/**
 * Sends lamports from a stealth account given a scalar key
 * Note: sending directly to your main account is highly discouraged for security purposes
 *
 * @export
 * @param {Connection} connection
 * @param {string} key
 * @param {PublicKey} dest
 * @param {number} amount
 * @return {*}  {Promise<string>}
 */
export async function sendFromStealth(
  connection: Connection,
  key: string,
  dest: PublicKey,
  amount: number,
): Promise<string> {
  const keyBN = new BN(base58.decode(key), 10, 'le');
  const keyscalar = BigInt(keyBN.toString());
  const pub = ed.Point.BASE.multiply(keyscalar);
  const pk = new PublicKey(pub.toRawBytes());
  const tix = SystemProgram.transfer({
    fromPubkey: pk,
    toPubkey: dest,
    lamports: amount,
  });

  const tx = new Transaction();
  tx.add(tix);
  const bhash = await connection.getLatestBlockhash();
  tx.recentBlockhash = bhash.blockhash;
  tx.feePayer = pk;

  await signTransaction(tx, key);
  if (!tx.signature) return "";

  const strategy: BlockheightBasedTransactionConfirmationStrategy = { blockhash: bhash.blockhash, signature: base58.encode(tx.signature), lastValidBlockHeight: bhash.lastValidBlockHeight };

  const txid = sendAndConfirmRawTransaction(connection, tx.serialize(), strategy);
  return txid;
}

/**
 * Sends tokens from a stealth account given a scalar key
 *
 * @export
 * @param {Connection} connection
 * @param {string} key
 * @param {PublicKey} token
 * @param {PublicKey} dest
 * @param {number} amount
 * @return {*}  {Promise<string>}
 */
export async function tokenFromStealth(
  connection: Connection,
  key: string,
  token: PublicKey,
  dest: PublicKey,
  amount: number,
): Promise<string> {
  const keyBN = new BN(base58.decode(key), 10, 'le');
  const keyscalar = BigInt(keyBN.toString());

  const pub = ed.Point.BASE.multiply(keyscalar);
  const pk = new PublicKey(pub.toRawBytes());

  const fromToken = await getAssociatedTokenAddress(token, pk);
  const destToken = await getAssociatedTokenAddress(token, dest);

  const tix = createTransferInstruction(fromToken, destToken, pk, amount);

  const tx = new Transaction();
  tx.add(tix);
  const bhash = await connection.getLatestBlockhash();

  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.feePayer = pk;

  await signTransaction(tx, key);
  if (!tx.signature) return "";

  const strategy: BlockheightBasedTransactionConfirmationStrategy = { blockhash: bhash.blockhash, signature: base58.encode(tx.signature), lastValidBlockHeight: bhash.lastValidBlockHeight };

  const txid = sendAndConfirmRawTransaction(connection, tx.serialize(), strategy);
  return txid;
}

/**
 * Checks whether a transaction was sent to the specific user
 *
 * @export
 * @param {Connection} connection
 * @param {string} sig
 * @param {string} privScanStr
 * @param {string} pubSpendStr
 * @return {*}  {Promise<ScanInfo[]>}
 */
export async function scan_check(
  connection: Connection,
  sig: string,
  privScanStr: string,
  pubSpendStr: string,
): Promise<ScanInfo[]> {
  const accts: ScanInfo[] = [];
  const a = { commitment: 'confirmed', maxSupportedTransactionVersion: 0 };
  const tx = await connection.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
  // const tx = await connection.getTransaction(sig);
  if (!tx) return accts;

  const dks = new PublicKey(dksap);
  const mes = tx.transaction.message;
  // const pos = mes.accountKeys.findIndex(fun);
  const pos = mes.getAccountKeys().staticAccountKeys.findIndex((value)=> {return value.equals(new PublicKey(dksap));});

  for (const instr of mes.compiledInstructions) {
    if (!instr.accountKeyIndexes.includes(pos)) {
      continue;
    }

    // sol transaction
    // format is source, dest, ephem, dksap
    if (instr.accountKeyIndexes.length === 4) {
      const ephem = mes.getAccountKeys().get(instr.accountKeyIndexes[2]);
      if (!ephem) continue;
      const dest = await receiverGenDest(privScanStr, pubSpendStr, ephem.toBase58());
      const dest2 = mes.getAccountKeys().get(instr.accountKeyIndexes[1]);
      if (!dest2) continue;
      if (dest === dest2.toBase58()) {
        accts.push({ account: dest, ephem: ephem.toBase58() });
      }
    }

    // token transaction
    // format is source token account, dest, source,  ephem, token, dksap
    else if (instr.accountKeyIndexes.length === 6) {
      const ephem = mes.getAccountKeys().get(instr.accountKeyIndexes[3]);
      if (!ephem) continue;
      const dest = await receiverGenDest(privScanStr, pubSpendStr, ephem.toBase58());
      const dest2 = mes.getAccountKeys().get(instr.accountKeyIndexes[4]);
      if (!dest2) continue;
      const tokenDest = await getAssociatedTokenAddress(dest2, new PublicKey(dest));
      const tokenDest2 = mes.getAccountKeys().get(instr.accountKeyIndexes[1]);
      if (!tokenDest2) continue;
      if (tokenDest.toBase58() === tokenDest2.toBase58()) {
        const tok = mes.getAccountKeys().get(instr.accountKeyIndexes[4]);
        if (!tok) continue;
        accts.push({ account: dest, ephem: ephem.toBase58(), token: tok.toBase58() });
      }
    }
  }

  return accts;
}
/**
 * Looks through previous transactions and returns those sent to a specific user
 * Note: optimal use would be through a dedicated scanner
 *
 * @param {Connection} connection
 * @param {string} privScanStr
 * @param {string} pubSpendStr
 * @return {*}  {Promise<ScanInfo[]>}
 */
export async function scan(connection: Connection, privScanStr: string, pubSpendStr: string, 
  options?: ConfirmedSignaturesForAddress2Options): Promise<ScanInfo[]> {
  let accts: ScanInfo[] = [];
  const res = await connection.getConfirmedSignaturesForAddress2(new PublicKey(dksap),options);
  for (const sig of res) {
    accts = accts.concat(await scan_check(connection, sig.signature, privScanStr, pubSpendStr));
  }
  return accts;
}
