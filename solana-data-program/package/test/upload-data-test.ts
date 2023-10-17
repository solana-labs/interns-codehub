import {
	ConfirmOptions,
	Connection,
	Keypair,
	Transaction,
	sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
	DataProgram,
	DataStatusOption,
	DataTypeOption,
	SerializationStatusOption,
} from "../src/index";
import { assert } from "./util/utils";

const main = async (connection: Connection, feePayer: Keypair) => {
	console.log("Feepayer:", feePayer.publicKey.toBase58());
	const oldLamps =
		(await connection.getAccountInfo(feePayer.publicKey, "finalized"))
			?.lamports ?? 0;
	console.log("feepayer:", oldLamps, "lamports");
	const dataAccount = new Keypair();
	console.log("Data Account:", dataAccount.publicKey.toBase58());

	const object = { message: "Hello World!", author: "Jane Doe" };
	const message = JSON.stringify(object);
	console.log(message);

	const [pda] = DataProgram.getPDA(dataAccount.publicKey);
	const initializeIx = DataProgram.initializeDataAccount(
		feePayer.publicKey,
		dataAccount.publicKey,
		feePayer.publicKey,
		false,
		false,
		message.length
	);

	console.log("PDA:", pda.toBase58());
	const initializeTx = new Transaction();
	initializeTx.add(initializeIx);
	console.log("initializing data account and pda");
	await sendAndConfirmTransaction(
		connection,
		initializeTx,
		[feePayer, dataAccount],
		{
			skipPreflight: true,
		} as ConfirmOptions
	);

	const updateIx = DataProgram.updateDataAccount(
		feePayer.publicKey,
		dataAccount.publicKey,
		DataTypeOption.JSON,
		Buffer.from(message, "ascii"),
		0,
		false,
		false,
		false
	);
	const updateTx = new Transaction();
	updateTx.add(updateIx);
	console.log("updating data account with data");
	await sendAndConfirmTransaction(connection, updateTx, [feePayer], {
		skipPreflight: true,
	} as ConfirmOptions);

	const meta = await DataProgram.parseMetadata(
		connection,
		dataAccount.publicKey,
		"confirmed"
	);

	assert(
		meta.authority === feePayer.publicKey.toBase58(),
		`authority didn't match - expected ${feePayer.publicKey.toBase58()}, got ${
			meta.authority
		}`
	);
	assert(
		meta.serializationStatus === SerializationStatusOption.UNVERIFIED,
		`serialization status didn't match - expected ${SerializationStatusOption.UNVERIFIED}, got ${meta.serializationStatus}`
	);
	assert(
		meta.dataStatus === DataStatusOption.INITIALIZED,
		`data status didn't match - expected ${DataStatusOption.INITIALIZED}, got ${meta.dataStatus}`
	);
	assert(
		!meta.isDynamic,
		`is dynamic didn't match - expected ${false}, got ${meta.isDynamic}`
	);
	assert(
		meta.dataType === DataTypeOption.JSON,
		`data type didn't match - expected ${DataTypeOption.JSON}, got ${meta.dataType}`
	);

	const data = await DataProgram.parseData(
		connection,
		dataAccount.publicKey,
		"confirmed"
	);
	assert(data != undefined, `data was undefined`);
	if (data) {
		assert(
			JSON.stringify(JSON.parse(data.toString())) === message,
			`data didn't match - expected ${message}, got ${JSON.stringify(
				JSON.parse(data.toString())
			)}`
		);
	}

	const closeIx = DataProgram.closeDataAccount(
		feePayer.publicKey,
		dataAccount.publicKey,
		false
	);
	const closeTx = new Transaction();
	closeTx.add(closeIx);

	const lamps =
		(await connection.getAccountInfo(feePayer.publicKey, "finalized"))
			?.lamports ?? 0;
	console.log("feepayer:", lamps, "lamports");
	console.log("closing data account and pda account");
	await sendAndConfirmTransaction(connection, closeTx, [feePayer], {
		skipPreflight: true,
	} as ConfirmOptions);
	const [newFeePayerInfo, newDataAccountInfo, newPdaInfo] = await Promise.all([
		connection.getAccountInfo(feePayer.publicKey, "finalized"),
		connection.getAccountInfo(dataAccount.publicKey, "finalized"),
		connection.getAccountInfo(pda, "finalized"),
	]);
	const newLamps = newFeePayerInfo?.lamports ?? 0;
	console.log("feepayer:", newLamps, "lamports");
	assert(newDataAccountInfo == null, `dataAccountInfo was not null`);
	assert(newPdaInfo == null, `PDAInfo was not null`);
	assert(
		newLamps > lamps,
		`updated lamports (${newLamps}) was not greater than before ${lamps}`
	);
};

export default main;
