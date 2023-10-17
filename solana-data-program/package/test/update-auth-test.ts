import {
	ConfirmOptions,
	Connection,
	Keypair,
	PublicKey,
	SimulateTransactionConfig,
	Transaction,
	TransactionMessage,
	VersionedTransaction,
	sendAndConfirmTransaction,
} from "@solana/web3.js";
import { DataProgram } from "../src/index";
import { assert } from "./util/utils";

const getAuthLamports = (
	connection: Connection,
	pk1: PublicKey,
	pk2: PublicKey
) => {
	return Promise.all([
		connection
			.getAccountInfo(pk1, "finalized")
			.then((info) => info?.lamports ?? 0),
		connection
			.getAccountInfo(pk2, "finalized")
			.then((info) => info?.lamports ?? 0),
	]);
};

const main = async (
	connection: Connection,
	feePayer: Keypair,
	newAuthority: Keypair
) => {
	console.log("Authority:", feePayer.publicKey.toBase58());
	const dataAccount = new Keypair();
	console.log("Data Account:", dataAccount.publicKey.toBase58());

	const [pda] = DataProgram.getPDA(dataAccount.publicKey);
	const initializeIx = DataProgram.initializeDataAccount(
		feePayer.publicKey,
		dataAccount.publicKey,
		feePayer.publicKey,
		false,
		true,
		0
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
			preflightCommitment: "finalized",
			confirmation: "finalized",
		} as ConfirmOptions
	);
	const authMeta = await DataProgram.parseMetadata(
		connection,
		dataAccount.publicKey,
		"confirmed"
	);
	assert(
		authMeta.authority === feePayer.publicKey.toBase58(),
		`authority didn't match - expected ${feePayer.publicKey.toBase58()}, got ${
			authMeta.authority
		}`
	);

	console.log("New Authority:", newAuthority.publicKey.toBase58());
	const updateAuthIx = DataProgram.updateDataAccountAuthority(
		feePayer.publicKey,
		dataAccount.publicKey,
		newAuthority.publicKey,
		false
	);
	const updateAuthTx = new Transaction();
	updateAuthTx.add(updateAuthIx);
	console.log("updating authority");
	await sendAndConfirmTransaction(
		connection,
		updateAuthTx,
		[feePayer, newAuthority],
		{
			skipPreflight: true,
			preflightCommitment: "finalized",
			confirmation: "finalized",
		} as ConfirmOptions
	);
	const newAuthMeta = await DataProgram.parseMetadata(
		connection,
		dataAccount.publicKey,
		"confirmed"
	);
	assert(
		newAuthMeta.authority === newAuthority.publicKey.toBase58(),
		`authority didn't match - expected ${newAuthority.publicKey.toBase58()}, got ${
			newAuthMeta.authority
		}`
	);

	const simulateIx = DataProgram.closeDataAccount(
		feePayer.publicKey,
		dataAccount.publicKey,
		false
	);
	const messageV0 = new TransactionMessage({
		payerKey: feePayer.publicKey,
		recentBlockhash: (await connection.getLatestBlockhash("finalized"))
			.blockhash,
		instructions: [simulateIx],
	}).compileToV0Message();
	const simulateTx = new VersionedTransaction(messageV0);
	console.log("simulate closing data account and pda account with old auth");
	const simulateData = await connection.simulateTransaction(simulateTx, {
		sigVerify: false,
	} as SimulateTransactionConfig);
	assert(simulateData.value.err != null, `simulate did not error out`);
	assert(
		JSON.stringify(simulateData.value.err).indexOf(`"Custom":6`) != -1,
		`simulate error ("Custom":6) was not found`
	);

	const [prevAuthLamps, prevNewAuthLamps] = await getAuthLamports(
		connection,
		feePayer.publicKey,
		newAuthority.publicKey
	);
	console.log("old:", prevAuthLamps);
	console.log("new:", prevNewAuthLamps);

	const closeIx = DataProgram.closeDataAccount(
		newAuthority.publicKey,
		dataAccount.publicKey,
		false
	);
	const closeTx = new Transaction();
	closeTx.add(closeIx);
	console.log("closing data account and pda account with new auth");
	await sendAndConfirmTransaction(connection, closeTx, [newAuthority], {
		skipPreflight: true,
		preflightCommitment: "finalized",
		confirmation: "finalized",
	} as ConfirmOptions);

	const [authLamps, newAuthLamps] = await getAuthLamports(
		connection,
		feePayer.publicKey,
		newAuthority.publicKey
	);
	console.log("old:", authLamps);
	console.log("new:", newAuthLamps);

	assert(
		authLamps === prevAuthLamps,
		`old authority lamports didn't match - expected ${prevAuthLamps}, got ${authLamps}`
	);
	assert(
		newAuthLamps > prevNewAuthLamps,
		`updated lamports (${newAuthLamps}) was not greater than before ${prevNewAuthLamps}`
	);
};

export default main;
