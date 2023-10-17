import {
	AccountInfo,
	Connection,
	Keypair,
	PublicKey,
	Transaction,
} from "@solana/web3.js";
import { createContext, useContext } from "react";
import { DataProgram, IDataAccountMeta, programId } from "solana-data-program";
import { ClusterContextType, EditorThemeType } from "./types";

export const isBase58 = (value: string): boolean =>
	/^[A-HJ-NP-Za-km-z1-9]*$/.test(value);

export const ClusterContext = createContext<ClusterContextType | null>(null);
export const useCluster = () =>
	useContext(ClusterContext) as ClusterContextType;

export const EditorThemeContext = createContext<EditorThemeType | null>(null);
export const useEditorTheme = () =>
	useContext(EditorThemeContext) as EditorThemeType;

export const getBaseURL = () => {
	if (process.env.NEXT_PUBLIC_VERCEL_ENV) {
		return "https://sold-website.vercel.app";
		return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
	}
	return process.env.NEXT_PUBLIC_HOST;
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const displaySize = (space: number): string => {
	let displaySize = space.toString() + " B";
	if (space > 1e6) {
		displaySize = space / 1e6 + " MB";
	} else if (space > 1e3) {
		displaySize = space / 1e3 + " KB";
	}
	return displaySize;
};

const signatures = new Map<string, string>([
	["JVBERi0", "application/pdf"],
	["R0lGODdh", "image/gif"],
	["R0lGODlh", "image/gif"],
	["iVBORw0KGgo", "image/png"],
	["/9j/", "image/jpg"],
	["PD", "image/svg+xml"],
]);

export const getMimeType = (base64: string): string => {
	let mime = "text/html";
	signatures.forEach((v, k) => {
		if (base64.startsWith(k)) {
			mime = v;
		}
	});
	return mime;
};

export const createAndInitializeDataAccount = async (
	connection: Connection,
	feePayer: PublicKey,
	authorityPK: PublicKey,
	isDynamic: boolean,
	initialSize: number
): Promise<[Transaction, Keypair]> => {
	const [createIx, dataAccount] = await DataProgram.createDataAccount(
		connection,
		feePayer,
		initialSize
	);
	const initializeIx = DataProgram.initializeDataAccount(
		feePayer,
		dataAccount.publicKey,
		authorityPK,
		true,
		isDynamic,
		initialSize
	);
	const tx = new Transaction();
	tx.add(createIx).add(initializeIx);
	tx.feePayer = feePayer;
	return [tx, dataAccount];
};

export const uploadDataPart = (
	feePayer: PublicKey,
	dataAccount: PublicKey,
	dataType: number,
	data: Buffer,
	offset: number,
	debug?: boolean
): Transaction => {
	const updateIx = DataProgram.updateDataAccount(
		feePayer,
		dataAccount,
		dataType,
		data,
		offset,
		false,
		true,
		debug
	);
	const tx = new Transaction();
	tx.add(updateIx);
	tx.feePayer = feePayer;
	return tx;
};

const TX_INTERVAL = 250;
export const handleUpload = (
	connection: Connection,
	recentBlockhash: Readonly<{
		blockhash: string;
		lastValidBlockHeight: number;
	}>,
	txs: Transaction[],
	handleUploadStatus: ((tx: Transaction) => void) | null
): Promise<void>[] => {
	return txs.map((tx, idx, allTxs) => {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				try {
					connection
						.sendRawTransaction(tx.serialize(), {
							maxRetries: 0,
							skipPreflight: true,
						})
						.then(async (txid) => {
							await connection
								.confirmTransaction(
									{
										blockhash: recentBlockhash.blockhash,
										lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
										signature: txid,
									},
									"confirmed"
								)
								.then(() => {
									if (handleUploadStatus) {
										handleUploadStatus(tx);
									}
									console.log(
										`${idx + 1}/${
											allTxs.length
										}: https://explorer.solana.com/tx/${txid}?cluster=devnet`
									);
								})
								.then(resolve)
								.catch((e) => {
									reject(e.message);
								});
						})
						.catch((e) => {
							reject(e.message);
						});
				} catch (err) {
					console.log("caught inside timeout");
				}
			}, idx * TX_INTERVAL);
		});
	});
};

/// Data Account Pagination
export const MAX_PAGES_TO_NAVIGATE = 5;
export const MAX_INACTIVE_PAGES_PER_SIDE = Math.floor(
	MAX_PAGES_TO_NAVIGATE / 2
);
export const START_PAGE_INDICES = [0, MAX_PAGES_TO_NAVIGATE];

export const getDataAccountsByAuthority = async (
	connection: Connection,
	authorityPK: string
) => {
	const allAccounts = await connection.getParsedProgramAccounts(
		programId,
		"confirmed"
	);
	const PDAs = new Map(
		(
			await connection.getParsedProgramAccounts(programId, {
				commitment: "confirmed",
				filters: [
					{
						dataSize: 38,
					},
					{
						memcmp: {
							offset: 2,
							bytes: authorityPK,
						},
					},
				],
			})
		).map(({ pubkey, account }) => [
			pubkey.toBase58(),
			DataProgram.parseMetadataFromAccountInfo(account as AccountInfo<Buffer>),
		])
	);
	const nonPDAs = allAccounts.filter(
		(account) => !PDAs.has(account.pubkey.toBase58())
	);
	const dataAccountPDAMap = new Map<PublicKey, IDataAccountMeta>();
	const dataAccounts = nonPDAs.filter(({ pubkey }) => {
		const [pda] = DataProgram.getPDA(pubkey);
		const metadata = PDAs.get(pda.toBase58());
		if (metadata) {
			dataAccountPDAMap.set(pubkey, metadata);
			return true;
		}
		return false;
	});
	const dataAccountsWithMeta = dataAccounts.map(({ pubkey, account }) => ({
		pubkey,
		account,
		meta: dataAccountPDAMap.get(pubkey) ?? ({} as IDataAccountMeta),
	}));
	return dataAccountsWithMeta;
};
