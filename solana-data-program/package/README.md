# solana-data-program

This package contains the Solana Data Program SDK code

[![npm][npm-image]][npm-url]
[![npm-downloads][npm-downloads-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/solana-data-program?style=flat
[npm-downloads-image]: https://img.shields.io/npm/dm/solana-data-program?style=flat
[npm-url]: https://www.npmjs.com/package/solana-data-program

## Installation

### Yarn

```shell
$ yarn add solana-data-program
```

### npm

```shell
$ npm install --save solana-data-program
```

## Setup

To import everything from the package you can do the following:

```javascript
import * as solanaDataProgram from "solana-data-program";
console.log(solanaDataProgram);
```

To make use of the instructions that interact with the Data Program and helper functions to parse the data stored, you can import the [**`DataProgram`**](#dataprogram-class) class as follows:

```javascript
import { DataProgram } from "solana-data-program";
console.log(DataProgram);
```

To import the Data Program enumerations and `programId`, you can do the following:

```javascript
import { programId, PDA_SEED } from "solana-data-program";
import {
	DataStatusOption,
	SerializationStatusOption,
	DataTypeOption,
} from "solana-data-program";

console.log("programId", programId);
console.log("PDA_SEED", PDA_SEED);
console.log("DataStatusOption", DataStatusOption);
console.log("SerializationStatusOption", SerializationStatusOption);
console.log("DataTypeOption", DataTypeOption);
```

## Usage

For more examples, check out the [`/examples`](https://github.com/nvsriram/solana-data-program/tree/main/examples) directory.

### To create a Data Account

```javascript
// ix to create the Data Account and keypair of Data Account
const [createIx, dataAccountKP] = await DataProgram.createDataAccount(
	connection,
	feePayer.publicKey,
	200
);
// create transaction with instruction
const createTx = new Transaction();
createTx.add(createIx);
```

### To initialize a Data Account

```javascript
// get the associated Metadata PDA Account
[pdaData] = DataProgram.getPDA(dataAccountKP.publicKey);
// ix to initialize the Data Account and Metadata Account
const initializeIx = DataProgram.initializeDataAccount(
	feePayer.publicKey,
	dataAccountKP.publicKey,
	authority.publicKey,
	true, // This assumes the Data Account is precreated. Change this to false if you want to create and initialize Data Account
	true, // The Data Account is set to be dynamic (i.e., can be realloc-ed up or down)
	200
);
const initializeTx = new Transaction();
initializeTx.add(initializeIx);
```

### To update a Data Account

```javascript
// ix to update the Data Account with datatype and data starting at offset
const updateIx = DataProgram.updateDataAccount(
	authority.publicKey,
	dataAccountKP.publicKey,
	dataType,
	data,
	offset,
	false, // reallocDown is false. Set to true if Data Account is dynamic and should realloc down
	false // verifyFlag is false. Set to true to see if the data conforms to its data type
);
// create transaction with instruction
const updateTx = new Transaction();
updateTx.add(updateIx);
```

### To update Authority of a Data Account

```javascript
// ix to update authority of Data Account
const updateAuthIx = DataProgram.updateDataAccountAuthority(
	authority.publicKey, // old authority
	dataAccount.publicKey,
	newAuthority.publicKey // new authority
);
// create transaction with instruction
const updateAuthTx = new Transaction();
updateAuthTx.add(updateAuthIx);
```

### To finalize the data of a Data Account

```javascript
// ix to finalize data of Data Account
const finalizeIx = DataProgram.finalizeDataAccount(
	authority.publicKey,
	dataAccount.publicKey
);
// create transaction with instruction
const finalizeTx = new Transaction();
finalizeTx.add(finalizeIx);
```

### To close a Data Account

```javascript
// ix to close Data Account and associated Metadata PDA Account
const closeIx = DataProgram.closeDataAccount(
	authority.publicKey,
	dataAccount.publicKey
);
// create transaction with instruction
const closeTx = new Transaction();
closeTx.add(closeIx);
```

### To get a Data Account's metadata and data

```javascript
// extract Data Account's metadata
const meta = await DataProgram.parseMetadata(connection, dataKey, "confirmed");
console.log(meta);
// extract Data Account's data
const data = await DataProgram.parseData(connection, dataKey, "confirmed");
console.log(data);
```

## `DataProgram` Class

The **`DataProgram`** class has the following methods:

- **`getPDA`**:

  - Returns the corresponding Metadata PDA Account for the given Data Account.

- **`createDataAccount`**:

  - Creates a new `Keypair` for the Data Account and returns a `SystemProgram.createAccount` instruction with the rent exempt amount of lamports for the Data Account and the Data Account's `Keypair`.

- **`initializeDataAccount`**:

  - Returns instruction to create and initialize the Data Account and associated Metadata PDA Account.
  - **NOTE**: This instruction can also be called using a previously created account to treat it as a Data Account.

- **`updateDataAccount`**:

  - Returns instruction to update the data type and data of a Data Account.

- **`updateDataAccountAuthority`**:

  - Returns instruction to update the authority of a Data Account.
  - **NOTE**: This instruction requires both the old and new authority to be signers to prevent accidental transfers.

- **`finalizeDataAccount`**:

  - Returns instruction to finalize the data of a Data Account.
  - **NOTE**: Finalized data can no longer be updated.

- **`closeDataAccount`**:

  - Returns instruction to close the Metadata PDA Account and Data Account and recover their lamports.

- **`parseMetadataFromAccountInfo`**:

  - Returns the parsed metadata from the associated Metadata PDA AccountInfo.
  - **NOTE**: This function can be called to parse the output of `getAccountInfo()` using the Metadata PDA Account.
  - Returns the metadata in the form of an [**`IDataAccountMeta`**](#idataaccountmeta-object) object

- **`parseMetadata`**:

  - Returns the parsed metadata from the associated Metadata PDA Account.
  - Returns the metadata in the form of an [**`IDataAccountMeta`**](#idataaccountmeta-object) object

- **`parseData`**:
  - Returns the Data Account's data as a `Buffer` or `undefined` if error

## `IDataAccountMeta` Object

**`IDataAccountMeta`** object has the following fields:

```javascript
/** Status of the Data Account */
dataStatus: DataStatusOption;

/** Status of the data serialization */
serializationStatus: SerializationStatusOption;

/** Base58-encoded string that represents the `PublicKey` of the authority of the Data Account */
authority: string;

/** `false` if the Data Account is static (fixed size) and `true` if dynamic (can realloc) */
isDynamic: boolean;

/** Version of the Data Program */
dataVersion: number;

/** Data type of the data stored in the Data Account */
dataType: DataTypeOption;

/** Bump seed used to derive the Metadata PDA Account */
bumpSeed: number;
```
