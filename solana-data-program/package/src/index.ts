import {
	AccountInfo,
	Commitment,
	Connection,
	Keypair,
	PublicKey,
	SystemProgram,
	TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";

/**
 * Program ID of the Solana Data Program
 */
const DATA_PROGRAM_ID = "ECQd7f4sYhcWX5G9DQ7Hgcf3URZTfgwVwjKzH2sMQeFW";
export const programId = new PublicKey(DATA_PROGRAM_ID);

/**
 * Seed used to derive the associated Metadata PDA Account
 */
export const PDA_SEED = "data_account_metadata";

/**
 * Enumeration of the data states of the Data Account
 *
 * @export
 * @enum {number}
 */
export enum DataStatusOption {
	UNINITIALIZED,
	INITIALIZED,
	FINALIZED,
}

/**
 * Enumeration of the data serialization states of the Data Account
 *
 * @export
 * @enum {number}
 */
export enum SerializationStatusOption {
	UNVERIFIED,
	VERIFIED,
	FAILED,
}

/**
 * Enumeration of the supported data types
 *
 * @export
 * @enum {number}
 */
export enum DataTypeOption {
	CUSTOM = 0,
	JSON = 1,
	IMG = 2,
	HTML = 3,
}

/**
 * Data stored in the Metadata PDA Account that represents
 * the metadata associated with a Data Account.
 *
 * @export
 * @interface IDataAccountMeta
 */
export interface IDataAccountMeta {
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
}

const trueFlag = Buffer.from(new Uint8Array([1]));
const falseFlag = Buffer.from(new Uint8Array([0]));

/**
 * Data Program class
 *
 * @export
 * @class DataProgram
 */
export class DataProgram {
	/**
	 * Returns the corresponding Metadata PDA Account for the given Data Account.
	 *
	 * @param {PublicKey} dataKey
	 * @return {[PublicKey, number]}
	 */
	static getPDA = (dataKey: PublicKey): [PublicKey, number] => {
		return PublicKey.findProgramAddressSync(
			[Buffer.from(PDA_SEED, "ascii"), dataKey.toBuffer()],
			programId
		);
	};

	/**
	 * Creates a new `Keypair` for the Data Account and returns a
	 * `SystemProgram.createAccount` instruction with the rent exempt
	 * amount of lamports for the Data Account and the Data Account's
	 * `Keypair`
	 *
	 * @param {Connection} connection
	 * @param {PublicKey} feePayer
	 * @param {number} initialSize
	 * @return {Promise<[TransactionInstruction, Keypair]>}
	 */
	static createDataAccount = async (
		connection: Connection,
		feePayer: PublicKey,
		initialSize: number
	): Promise<[TransactionInstruction, Keypair]> => {
		const dataAccount = new Keypair();
		const rentExemptAmount = await connection.getMinimumBalanceForRentExemption(
			initialSize
		);
		const createIx = SystemProgram.createAccount({
			fromPubkey: feePayer,
			newAccountPubkey: dataAccount.publicKey,
			lamports: rentExemptAmount,
			space: initialSize,
			programId,
		});
		return [createIx, dataAccount];
	};

	/**
	 * Returns instruction to create and initialize the Data Account and associated
	 * Metadata PDA Account.
	 *
	 * **NOTE**: This instruction can also be called using a previously created account to treat it as a Data Account.
	 *
	 * @param {PublicKey} feePayer Feepayer for creation of the Metadata PDA Account and
	 * optionally the Data Account (if not previously created).
	 * @param {PublicKey} dataAccount
	 * @param {PublicKey} authorityPK Authority of the Data Account.
	 * @param {boolean} isCreated Determines whether the Data Account would need to be created in this instruction. Set to`true` if the Data Account is previously created.
	 * @param {boolean} isDynamic Set `true` if the Data Account should be dynamic and `false` if static.
	 * @param {number} initialSize Size in bytes to allocate to the Data Account. **NOTE**: This value will
	 * be ignored if the Data Account is created prior to this instruction.
	 * @param {boolean} [debug] Set to `true` if the instruction should output debug logs.
	 * @return {TransactionInstruction}
	 */
	static initializeDataAccount = (
		feePayer: PublicKey,
		dataAccount: PublicKey,
		authorityPK: PublicKey,
		isCreated: boolean,
		isDynamic: boolean,
		initialSize: number,
		debug?: boolean
	): TransactionInstruction => {
		const [pda] = this.getPDA(dataAccount);
		const idx0 = Buffer.from(new Uint8Array([0]));
		const space = new BN(initialSize).toArrayLike(Buffer, "le", 8);
		const authority = authorityPK.toBuffer();
		const initializeIx = new TransactionInstruction({
			keys: [
				{
					pubkey: feePayer,
					isSigner: true,
					isWritable: true,
				},
				{
					pubkey: dataAccount,
					isSigner: true,
					isWritable: true,
				},
				{
					pubkey: pda,
					isSigner: false,
					isWritable: true,
				},
				{
					pubkey: SystemProgram.programId,
					isSigner: false,
					isWritable: false,
				},
			],
			programId,
			data: Buffer.concat([
				idx0,
				authority,
				space,
				isDynamic ? trueFlag : falseFlag,
				isCreated ? trueFlag : falseFlag,
				debug ? trueFlag : falseFlag,
			]),
		});

		return initializeIx;
	};

	/**
	 * Returns instruction to update the data type and data of a Data Account.
	 *
	 * @param {PublicKey} authority Authority of the Data Account.
	 * @param {PublicKey} dataAccount
	 * @param {number} dataType Data type to set.
	 * @param {Buffer} data Data to be written to Data Account.
	 * @param {number} offset Byte offset to start writing from.
	 * @param {boolean} reallocDown Set `true` if the Data Account should realloc down to the end of new data being added. **NOTE**: This value will
	 * be ignored if the Data Account is static.
	 * @param {boolean} verifyFlag Set `true` if the new data should be verified to see that it conforms to the data type.
	 * @param {boolean} [debug] Set to `true` if the instruction should output debug logs.
	 * @return {TransactionInstruction}
	 */
	static updateDataAccount = (
		authority: PublicKey,
		dataAccount: PublicKey,
		dataType: number,
		data: Buffer,
		offset: number,
		reallocDown: boolean,
		verifyFlag: boolean,
		debug?: boolean
	): TransactionInstruction => {
		const [pda] = this.getPDA(dataAccount);
		const idx1 = Buffer.from(new Uint8Array([1]));
		const offsetBuffer = new BN(offset).toArrayLike(Buffer, "le", 8);
		const dataTypeBuffer = new BN(dataType).toArrayLike(Buffer, "le", 1);
		const dataLenBuffer = new BN(data.length).toArrayLike(Buffer, "le", 4);
		const updateIx = new TransactionInstruction({
			keys: [
				{
					pubkey: authority,
					isSigner: true,
					isWritable: true,
				},
				{
					pubkey: dataAccount,
					isSigner: false,
					isWritable: true,
				},
				{
					pubkey: pda,
					isSigner: false,
					isWritable: true,
				},
				{
					pubkey: SystemProgram.programId,
					isSigner: false,
					isWritable: false,
				},
			],
			programId,
			data: Buffer.concat([
				idx1,
				dataTypeBuffer,
				dataLenBuffer,
				data,
				offsetBuffer,
				reallocDown ? trueFlag : falseFlag,
				verifyFlag ? trueFlag : falseFlag,
				debug ? trueFlag : falseFlag,
			]),
		});

		return updateIx;
	};

	/**
	 * Returns instruction to update the authority of a Data Account.
	 *
	 * **NOTE**: This instruction requires both the old and new authority
	 * to be signers to prevent accidental transfers.
	 *
	 * @param {PublicKey} oldAuthority Old authority of the Data Account.
	 * @param {PublicKey} dataAccount
	 * @param {PublicKey} newAuthority New authority of the Data Account.
	 * @param {boolean} [debug] Set to `true` if the instruction should output debug logs.
	 * @return {TransactionInstruction}
	 */
	static updateDataAccountAuthority = (
		oldAuthority: PublicKey,
		dataAccount: PublicKey,
		newAuthority: PublicKey,
		debug?: boolean
	): TransactionInstruction => {
		const [pda] = this.getPDA(dataAccount);
		const idx2 = Buffer.from(new Uint8Array([2]));
		const updateAuthorityIx = new TransactionInstruction({
			keys: [
				{
					pubkey: oldAuthority,
					isSigner: true,
					isWritable: false,
				},
				{
					pubkey: dataAccount,
					isSigner: false,
					isWritable: false,
				},
				{
					pubkey: pda,
					isSigner: false,
					isWritable: true,
				},
				{
					pubkey: newAuthority,
					isSigner: true,
					isWritable: false,
				},
			],
			programId,
			data: Buffer.concat([idx2, debug ? trueFlag : falseFlag]),
		});

		return updateAuthorityIx;
	};

	/**
	 * Returns instruction to finalize the data of a Data Account.
	 *
	 * **NOTE**: Finalized data can no longer be updated.
	 *
	 * @param {PublicKey} authority Authority of the Data Account.
	 * @param {PublicKey} dataAccount
	 * @param {boolean} [debug] Set to `true` if the instruction should output debug logs.
	 * @return {TransactionInstruction}
	 */
	static finalizeDataAccount = (
		authority: PublicKey,
		dataAccount: PublicKey,
		debug?: boolean
	): TransactionInstruction => {
		const [pda] = this.getPDA(dataAccount);
		const idx3 = Buffer.from(new Uint8Array([3]));
		const finalizeIx = new TransactionInstruction({
			keys: [
				{
					pubkey: authority,
					isSigner: true,
					isWritable: true,
				},
				{
					pubkey: dataAccount,
					isSigner: false,
					isWritable: false,
				},
				{
					pubkey: pda,
					isSigner: false,
					isWritable: true,
				},
			],
			programId,
			data: Buffer.concat([idx3, debug ? trueFlag : falseFlag]),
		});

		return finalizeIx;
	};

	/**
	 * Returns instruction to close the Metadata PDA Account and Data Account and recover
	 * their lamports.
	 *
	 * @param {PublicKey} authority Authority of the Data Account.
	 * @param {PublicKey} dataAccount
	 * @param {boolean} [debug] Set to `true` if the instruction should output debug logs.
	 * @return {TransactionInstruction}
	 */
	static closeDataAccount = (
		authority: PublicKey,
		dataAccount: PublicKey,
		debug?: boolean
	): TransactionInstruction => {
		const [pda] = this.getPDA(dataAccount);
		const idx4 = Buffer.from(new Uint8Array([4]));
		const closeIx = new TransactionInstruction({
			keys: [
				{
					pubkey: authority,
					isSigner: true,
					isWritable: true,
				},
				{
					pubkey: dataAccount,
					isSigner: false,
					isWritable: true,
				},
				{
					pubkey: pda,
					isSigner: false,
					isWritable: true,
				},
			],
			programId,
			data: Buffer.concat([idx4, debug ? trueFlag : falseFlag]),
		});

		return closeIx;
	};

	/**
	 * Returns the parsed metadata from the associated Metadata PDA AccountInfo.
	 *
	 * **NOTE**: This function can be called to parse the output of `getAccountInfo()`
	 * using the Metadata PDA Account.
	 *
	 * @param {AccountInfo<Buffer> | null} metadataInfo
	 * @return {IDataAccountMeta}
	 */
	static parseMetadataFromAccountInfo = (
		metadataInfo: AccountInfo<Buffer> | null
	): IDataAccountMeta => {
		const accountMeta = {} as IDataAccountMeta;
		if (metadataInfo && metadataInfo.data.length > 0) {
			const metadata = metadataInfo.data;
			accountMeta.dataStatus = metadata.subarray(0, 1).readUInt8();
			accountMeta.serializationStatus = metadata.subarray(1, 2).readUInt8();
			accountMeta.authority = new PublicKey(
				metadata.subarray(2, 34)
			).toBase58();
			accountMeta.isDynamic = metadata.subarray(34, 35).readUInt8()
				? true
				: false;
			accountMeta.dataVersion = new BN(
				metadata.subarray(35, 36),
				"le"
			).toNumber();
			accountMeta.dataType = new BN(metadata.subarray(36, 37), "le").toNumber();
			accountMeta.bumpSeed = new BN(metadata.subarray(37, 38), "le").toNumber();
		}

		return accountMeta;
	};

	/**
	 * Returns the parsed metadata from the associated Metadata PDA Account.
	 *
	 * @param {Connection} connection
	 * @param {PublicKey} dataKey
	 * @param {Commitment} commitment
	 * @return {Promise<IDataAccountMeta>}
	 */
	static parseMetadata = async (
		connection: Connection,
		dataKey: PublicKey,
		commitment: Commitment
	): Promise<IDataAccountMeta> => {
		const [metaKey] = this.getPDA(dataKey);
		const metadataAccount = await connection.getAccountInfo(
			metaKey,
			commitment
		);
		return this.parseMetadataFromAccountInfo(metadataAccount);
	};

	/**
	 * Returns the Data Account's data.
	 *
	 * @param {Connection} connection
	 * @param {PublicKey} dataKey
	 * @param {Commitment} commitment
	 * @return {(Promise<Buffer | undefined>)}
	 */
	static parseData = async (
		connection: Connection,
		dataKey: PublicKey,
		commitment: Commitment
	): Promise<Buffer | undefined> => {
		const dataAccount = await connection.getAccountInfo(dataKey, commitment);
		return dataAccount?.data;
	};
}
