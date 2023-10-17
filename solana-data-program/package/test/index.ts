import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import dotenv from "dotenv";
import checkFinal from "./check-final-test";
import updateAuth from "./update-auth-test";
import updateData from "./update-data-test";
import uploadData from "./upload-data-test";

dotenv.config();

const main = async () => {
	const connection = new Connection(process.env.CONNECTION_URL as string);

	const primary = Keypair.fromSecretKey(
		bs58.decode(process.env.TEST_PRIMARY_PRIVATE as string)
	);
	const primaryLamps =
		(await connection.getAccountInfo(primary.publicKey, "finalized"))
			?.lamports ?? 0;
	if (primaryLamps < 1e9) {
		console.log("Requesting Airdrop of 1.5 SOL for primary...");
		await connection.requestAirdrop(primary.publicKey, 1.5e9);
		console.log("Airdrop received");
	}

	const secondary = Keypair.fromSecretKey(
		bs58.decode(process.env.TEST_SECONDARY_PRIVATE as string)
	);
	const secondaryLamps =
		(await connection.getAccountInfo(secondary.publicKey, "finalized"))
			?.lamports ?? 0;
	if (secondaryLamps < 1e9) {
		console.log("Requesting Airdrop of 1.5 SOL for secondary...");
		await connection.requestAirdrop(secondary.publicKey, 1.5e9);
		console.log("Airdrop received");
	}

	// These test cases are designed to run sequentially and in the following order
	console.log("=============== Run test: uploadData ===============");
	await uploadData(connection, primary);
	console.log("=============== Run test: updateData ===============");
	await updateData(connection, primary);
	console.log("=============== Run test: updateAuth ===============");
	await updateAuth(connection, primary, secondary);
	console.log("=============== Run test: checkFinal ===============");
	await checkFinal(connection, primary);
	console.log("=============== All tests successful ===============");
};

main()
	.catch((err) => {
		console.error(err);
		process.exit(-1);
	})
	.then(() => process.exit());
