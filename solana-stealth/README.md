# Solana Stealth Sending

This package allows stealth transactions on solana using DKSAP.

The package is based around the following flow:

0. Recipient generates public scan and spend keys and distributes them just like their Public Key for their main account (once)

1. Sender sends SOL/tokens using stealth send (which creates a new stealth account and generates an ephemeral keypair)

2. Receiver scans to find the new stealth account and the ephemeral key used 

3. Receiver calculates private key for the stealth account using the ephemeral key 

4. Receiver uses the send from stealth functions or uses genFullSignature to sign any message 


The package offers the following main functions:

### `genKeys`

Creates stealth keys from a signature.

This generates a [**`StealthKeys`**](#stealthkeys) object

```javascript
import {genKeys} from "solana-stealth"
// ix to create a stealth transfer
const ar = utf8.encode("Signing this message is equivalent to generating your private keys. " +
        "Do not sign this once you have already generated your private keys.");

const sig = await signMessage(ar); // signature method of your choice (e.g. wallet adapter)
const keys: StealthKeys = await genKeys(sig);

console.log(keys.privScan);
console.log(keys.pubScan);
console.log(keys.privSpend);
console.log(keys.pubSpend);
```


### `stealthTransferIx`

Returns an instruction to send SOL using a stealth transfer.

This takes the recipient's public scan and spend keys, generates the destination with the help of an ephemeral keypair and constructs a transfer instruction that will be picked up by a scanner.

```javascript
import {stealthTransferIx} from "solana-stealth"
// ix to create a stealth transfer
const transferIx = await stealthTransferIx(publicKey, pubScan, pubSpend, amount);
// create transaction with instruction
let transferTx = new Transaction();
transferTx.add(transferIx);
```


### `stealthTokenTransferTransaction`

Returns a transaction that sends tokens using a stealth transfer.

This takes the recipient's public scan and spend keys, generates the destination with the help of an ephemeral keypair and constructs a transfer transaction that creates the associated account and sends the tokens in a way that will be picked up by a scanner.  

```javascript
import {stealthTokenTransferTransaction} from "solana-stealth"
// tx to create a stealth transfer
const transferTx = await stealthTokenTransferTransaction(publicKey, token, pubScan, pubSpend, amount);
```

### `signTransaction`

Signs a transaction from a stealth account.

This takes the message and the stealth account's private key (generated using [receiverGenKey](#receivergenkey) or similar) and signs it.

```javascript
import {stealthTransferIx, signTransaction} from "solana-stealth"

// ix to create a stealth transfer
const transferIx = await stealthTransferIx(stealthPublicKey, pubScan, pubSpend, amount);
// create transaction with instruction
let transferTx = new Transaction();
transferTx.add(transferIx);

// sign transaction
transferTx = await signTransaction(transferTx,stealthPrivateKey);

// send transaction
await sendAndConfirmRawTransaction(connection,transferTx.serialize());

```

### `sendFromStealth`

Sends SOL from a stealth account given the stealth key.

This creates a standard transfer transaction and signs it using signTransaction before sending 

```javascript
import {sendFromStealth} from "solana-stealth"
await sendFromStealth(connection,stealthkey,dest,amount);
```

### `tokenFromStealth`

Sends tokens from a stealth account given the stealth key.

This creates a standard token transfer transaction and signs it using signTransaction before sending 

```javascript
import {sendFromStealth} from "solana-stealth"
await tokenFromStealth(connection, stealthkey, token, dest, amount);
```

### `scan_check`

Finds all stealth accounts for a specific user in a given transaction from its signature
```javascript
import {scan_check} from "solana-stealth"

const result = await scan_check(connection, signature, privateScan, publicSpend);
```

### `scan`

Scans previous stealth transactions and finds all stealth accounts for a specific user 

Returns an array of [**`ScanInfo`**](#scaninfo) 

```javascript
import {scan} from "solana-stealth"

const results = await scan(
    connection,
    privScan,
    pubSpend,
    {limit: 30} // optional config
); 
```

### `receiverGenKey`

Calculates the private key for a stealth account  

```javascript
import {receiverGenKey} from "solana-stealth"

const key = await receiverGenKey(privScan,privSpend,ephem); 
```



There are also several potentially useful functions provided:

### `receiverGenKeyWithSignature`

Calculates the private key for a stealth account from the recipients signature  

```javascript
import {receiverGenKeyWithSignature} from "solana-stealth"

// ix to create a stealth transfer
const message = utf8.encode("Signing this message is equivalent to generating your private keys. " +
        "Do not sign this once you have already generated your private keys.");

const sig = await signMessage(message); // signature method of your choice (e.g. wallet adapter)
const key = await receiverGenKeyWithSignature(signature,ephem); 
```

### `genFullSignature`

Generates a signature from a stealth account.

This takes a message and the stealth account's private key (generated using receiverGenKey or similar) and returns a valid signature.

```javascript
import {stealthTransferIx, genFullSignature} from "solana-stealth"

// ix to create a stealth transfer
const transferIx = await stealthTransferIx(stealthPublicKey, pubScan, pubSpend, amount);
// create transaction with instruction
let transferTx = new Transaction();
transferTx.add(transferIx);
const transactionBuffer = transferTx.serializeMessage();

// generate signature
const sig = genFullSignature(transactionBuffer, scalarKey);

transferTx.addSignature(stealthPublicKey,Buffer.from(sig));
```

### `stealthTransfer`

Sends SOL stealthily to recipient.
This calls [stealthTransferIx](#stealthtransferix) and runs the resultant instruction. Because of this it takes a signer.

```javascript
import {stealthTransfer} from "solana-stealth"
// sends SOL stealthily
const result = await stealthTransfer(connection,signer, pubScan, pubSpend, amount);
```

### `stealthTokenTransfer`

Sends tokens stealthily to recipient.
This calls [stealthTokenTransferTransaction](#stealthtokentransfertransaction) and runs the resultant transaction. Because of this it takes a signer.

```javascript
import {stealthTokenTransfer} from "solana-stealth"
// sends tokens stealthily
const result = await stealthTokenTransfer(connection, source, token, pubScan, pubSpend, amount);
```

### `stealthTokenTransferTransaction2`

Returns a transaction that sends tokens using a stealth transfer with a feepayer.

This takes the recipient's public scan and spend keys, generates the destination with the help of an ephemeral keypair and constructs a transfer transaction that creates the associated account and sends the tokens in a way that will be picked up by a scanner.  

```javascript
import {stealthTokenTransferTransaction2} from "solana-stealth"
// tx to create a stealth transfer
const transferTx = await stealthTokenTransferTransaction2(feepayer, source, token, pubScan, pubSpend, amount);
```

### `stealthTokenTransfer2`

Sends tokens stealthily to recipient with a feepayer.
This calls [stealthTokenTransferTransaction2](#stealthtokentransfertransaction2) and runs the resultant transaction. Because of this it takes a signer and an owner.

```javascript
import {stealthTransfer} from "solana-stealth"
// sends SOL stealthily
const result = await stealthTokenTransfer2(connection, feepayer, source, token, pubScan, pubSpend, owner, amount);
```

### `senderGenAddress`

Generates base58 encoded address to send to given ephemeral keypair.

This is a mostly internal function used within the stealth sends 

```javascript
import {senderGenAddress} from "solana-stealth"


const dest = await senderGenAddress(pubScan, pubSpend, ephemeral);
```

### `receiverGenDest`

Calculates the destination for a stealth send using an given ephemeral key  

This is a mostly internal function used for scanning 

```javascript
import {receiverGenDest} from "solana-stealth"

const dest = await receiverGenDest(privScan,pubSpend,ephem); 
```

Objects:
### `StealthKeys`

```javascript
// base58 encoded public and private scan and spend keys 
pubScan: string;
pubSpend: string;
privScan: string;
privSpend: string;
```

### `ScanInfo`

```javascript
account: string; // base58 encoding of stealth account (note: tokens are sent to the associated token account)
ephem: string; // ephemeral key used for address generation 
token?: string; // token if it was a token transfer
```

### Miscellaneous 

In some cases, it can be challenging or not possible to do a stealth transfer (e.g. transferring from a PDA). 
In this case a useful trick is to generate the address and "notify" by sending 0 through a stealth transfer and then use the destination for the regular send. 

Ex.

```javascript
const notifyIx = await stealthTransferIx(
    new PublicKey(account.pk),
    scankey.toBase58(),
    spendkey.toBase58(),
    0
);
const dest = notifyIx.keys[1].pubkey; // destination stealth account 
// send normally using this destination

notifyTx = await stealthTokenTransferTransaction(
    feePayerPk,
    token,
    scankey,
    spendkey,
    0
);

const destOwner = notifyTx.instructions[1].keys[1].pubkey; // destination stealth account
const destToken = await getAssociatedTokenAddress(
    token,
    destOwner,
); // destination stealth associated token account

```
