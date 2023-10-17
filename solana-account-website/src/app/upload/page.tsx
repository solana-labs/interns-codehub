"use client";

import { ClusterNames } from "@/app/utils/types";
import {
	createAndInitializeDataAccount,
	handleUpload,
	isBase58,
	uploadDataPart,
	useCluster,
} from "@/app/utils/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { DataTypeOption } from "solana-data-program";
import AuthorityRow from "../components/upload/authority-row";
import DataTypeRow from "../components/upload/datatype-row";
import DynamicRow from "../components/upload/dynamic-row";
import FeePayerRow from "../components/upload/feepayer-row";
import FileRow from "../components/upload/file-row";
import UploadButton from "../components/upload/upload-button";
import UploadStatusBar from "../components/upload/upload-status-bar";

const UploadPage = () => {
	const [authority, setAuthority] = useState<string>("");
	const [isDynamic, setIsDynamic] = useState(false);
	const [space, setSpace] = useState(0);
	const [dataType, setDataType] = useState<DataTypeOption>(
		DataTypeOption.CUSTOM
	);
	const [fileData, setFileData] = useState<Buffer | null>(null);

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dataAccount, setDataAccount] = useState<string | null>(null);
	const [dataAccountStatus, setDataAccountStatus] = useState<number>(-1);

	const { cluster } = useCluster();
	const { publicKey: feePayer, signAllTransactions } = useWallet();

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!feePayer || !authority || !isBase58(authority) || !fileData) {
			return;
		}
		try {
			setError(null);
			setLoading(true);

			const clusterURL = Object.values(ClusterNames).find(
				({ name }) => name === cluster
			)?.url;
			if (!clusterURL) {
				setError("Invalid cluster");
				return;
			}
			if (!signAllTransactions) {
				return;
			}
			const clusterConnection = new Connection(clusterURL);
			const authorityPK = new PublicKey(authority);

			const PART_SIZE = 881;
			const parts = Math.ceil(fileData.length / PART_SIZE);
			const allTxs: Transaction[] = [];
			let recentBlockhash = await clusterConnection.getLatestBlockhash();

			const [cTx, dataKP] = await createAndInitializeDataAccount(
				clusterConnection,
				feePayer,
				authorityPK,
				isDynamic,
				space
			);
			allTxs.push(cTx);
			// data part txs
			let current = 0;
			while (current < parts) {
				const part = fileData.subarray(
					current * PART_SIZE,
					(current + 1) * PART_SIZE
				);
				const offset = current * PART_SIZE;
				const tx = uploadDataPart(
					feePayer,
					dataKP.publicKey,
					dataType,
					part,
					offset
				);
				allTxs.push(tx);
				++current;
			}
			// send and confirm txs
			let signedTxs: Transaction[] = [];
			let initialized = null;
			while (!initialized) {
				recentBlockhash = await clusterConnection.getLatestBlockhash();
				allTxs.map((tx, idx) => {
					tx.recentBlockhash = recentBlockhash.blockhash;
					if (idx === 0) {
						tx.sign(dataKP);
					}
					return tx;
				});
				signedTxs = await signAllTransactions(allTxs);
				// create and initialize data account + pda
				setDataAccountStatus(0);
				const txid = await clusterConnection
					.sendRawTransaction(signedTxs[0].serialize())
					.catch((err) => {
						if (err instanceof Error) {
							console.log(err.message);
						}
						initialized = false;
					});
				if (!txid) continue;
				await clusterConnection
					.confirmTransaction(
						{
							blockhash: recentBlockhash.blockhash,
							lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
							signature: txid,
						},
						"finalized"
					)
					.then(() => {
						console.log(
							`${"created"}: https://explorer.solana.com/tx/${txid}?cluster=devnet`
						);
						setDataAccountStatus((1 / (parts + 1)) * 100);
						setDataAccount(dataKP.publicKey.toBase58());
						initialized = true;
					});
			}
			// upload data parts
			let partTxs = signedTxs.slice(1);
			const completedTxs = new Set<number>();
			let partOffset = 0;
			const handleUploadStatus = (tx: Transaction) => {
				setDataAccountStatus((prev) => prev + 100 / (parts + 1));
				completedTxs.add(partOffset + partTxs.indexOf(tx));
			};
			while (completedTxs.size < parts) {
				try {
					await Promise.allSettled(
						handleUpload(
							clusterConnection,
							recentBlockhash,
							partTxs,
							handleUploadStatus
						)
					).then(async (p) => {
						const rejected = p.filter((r) => r.status === "rejected");
						if (rejected.length === 0) return;
						// remake and sign all incomplete txs with new blockhash
						recentBlockhash = await clusterConnection.getLatestBlockhash();
						const allTxs: Transaction[] = [];
						let i = 0;
						for (; i < parts; ++i) {
							if (!completedTxs.has(i)) {
								partOffset = i;
								break;
							}
						}
						if (i === parts) {
							partOffset = i;
							console.log("completed");
							setDataAccountStatus(100);
						}
						let current = partOffset;
						while (current < parts) {
							const part = fileData.subarray(
								current * PART_SIZE,
								(current + 1) * PART_SIZE
							);
							const offset = current * PART_SIZE;
							const tx = uploadDataPart(
								feePayer,
								dataKP.publicKey,
								dataType,
								part,
								offset
							);
							tx.recentBlockhash = recentBlockhash.blockhash;
							allTxs.push(tx);
							++current;
						}
						partTxs = await signAllTransactions(allTxs);
						console.log(completedTxs.size, partTxs.length);
					});
				} catch (err) {
					console.log(err);
				}
			}
			setLoading(false);
		} catch (err) {
			if (err instanceof Error) {
				setError(err.message);
			}
		}
	};

	return (
		<form className="grid auto-rows-max w-full h-full" onSubmit={handleSubmit}>
			<FeePayerRow />
			<AuthorityRow authority={authority} setAuthority={setAuthority} />
			<FileRow
				dataType={dataType}
				fileData={fileData}
				setDataType={setDataType}
				setSpace={setSpace}
				setFileData={setFileData}
				setError={setError}
			/>
			<DataTypeRow dataType={dataType} setDataType={setDataType} />
			<DynamicRow
				isDynamic={isDynamic}
				setIsDynamic={setIsDynamic}
				space={space}
				setSpace={setSpace}
			/>
			<div className="flex flex-row items-center mt-4 sm:mt-10">
				<UploadButton
					dataAccount={dataAccount}
					loading={loading}
					dataAccountStatus={dataAccountStatus}
				/>
			</div>
			<div className="mt-5 md:mt-0 text-lg break-words">
				{dataAccount && (
					<h1 className="text-xs sm:text-sm lg:text-base">
						<p className="text-emerald-500 dark:text-solana-green/80 font-semibold">
							Data Account initialized:{" "}
						</p>
						<Link
							href={`/${dataAccount}?cluster=${cluster}`}
							className="underline text-xs sm:text-sm lg:text-base break-all"
						>
							{dataAccount}
						</Link>
					</h1>
				)}
				<UploadStatusBar dataAccountStatus={dataAccountStatus} />
			</div>
			{error && (
				<div className="mt-5 md:mt-0">
					<h1 className="text-xs sm:text-sm lg:text-base">
						<p className="text-rose-500 font-semibold">
							An error occurred while uploading...
						</p>
						{error}
					</h1>
				</div>
			)}
		</form>
	);
};

export default UploadPage;
