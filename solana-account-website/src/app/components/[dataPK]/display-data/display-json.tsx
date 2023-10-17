import {
	ClusterNames,
	EditorThemeKeys,
	EditorThemeMap,
} from "@/app/utils/types";
import {
	handleUpload,
	uploadDataPart,
	useCluster,
	useEditorTheme,
} from "@/app/utils/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import dynamic from "next/dynamic";
import router from "next/router";
import { useEffect, useMemo, useState } from "react";
import {
	DataStatusOption,
	DataTypeOption,
	IDataAccountMeta,
} from "solana-data-program";

const ReactJsonDynamic = dynamic(import("react-json-view"), { ssr: false });

const JSONDisplay = ({
	json,
	len,
	dataPK,
	meta,
	refresh,
}: {
	json: object;
	len: number;
	dataPK: string;
	meta: IDataAccountMeta;
	refresh: () => void;
}) => {
	const { editorTheme, setEditorTheme } = useEditorTheme();
	const { cluster } = useCluster();
	const { publicKey: authority, signAllTransactions } = useWallet();

	const [saveState, setSaveState] = useState("Save");
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState({});

	const unsavedChanges = useMemo(
		() => JSON.stringify(data) != JSON.stringify(json),
		[data, json]
	);

	useEffect(() => setData(json), [json]);

	// prompt the user if they try and leave with unsaved changes
	useEffect(() => {
		const warningText =
			"You have unsaved changes - are you sure you wish to leave this page?";
		const handleWindowClose = (e: BeforeUnloadEvent) => {
			if (!unsavedChanges) {
				return;
			}
			e.preventDefault();
			return (e.returnValue = warningText);
		};
		const handleBrowseAway = () => {
			if (!unsavedChanges) {
				return;
			}
			if (window.confirm(warningText)) {
				return;
			}
			router.events.emit("routeChangeError");
			throw "routeChange aborted.";
		};
		window.addEventListener("beforeunload", handleWindowClose);
		router.events.on("routeChangeStart", handleBrowseAway);
		return () => {
			window.removeEventListener("beforeunload", handleWindowClose);
			router.events.off("routeChangeStart", handleBrowseAway);
		};
	}, [unsavedChanges]);

	const handleCancel = () => {
		setData(json);
		setSaveState("Save");
		setError(null);
	};

	const handleSave = async () => {
		if (
			!authority ||
			meta.authority != authority.toBase58() ||
			!signAllTransactions
		) {
			setError(
				"Invalid authority wallet. Please sign in to wallet to continue..."
			);
			return;
		}

		const old = JSON.stringify(json);
		const updated = JSON.stringify(data);
		let updateData: Buffer;
		try {
			setSaveState("Saving...");
			setError(null);

			const clusterURL = Object.values(ClusterNames).find(
				({ name }) => name === cluster
			)?.url;
			if (!clusterURL) {
				setError("Invalid cluster");
				return;
			}

			if (meta.dataStatus === DataStatusOption.FINALIZED) {
				setError("Data account is finalized so cannot be updated");
				return;
			}

			const clusterConnection = new Connection(clusterURL);
			const dataAccount = new PublicKey(dataPK);

			// start offset
			let idx = 0;
			const min = Math.min(old.length, updated.length);
			for (idx; idx < min; ++idx) {
				if (old[idx] === updated[idx]) {
					continue;
				}
				break;
			}
			const offset = idx;

			if (old.length === updated.length) {
				// chunk end
				for (idx = min; idx > offset; --idx) {
					if (old[idx] === updated[idx]) {
						continue;
					}
					break;
				}
				updateData = Buffer.from(updated.substring(offset, idx + 1), "ascii");
			} else if (old.length < updated.length) {
				if (meta.isDynamic || updated.length <= len) {
					updateData = Buffer.from(updated.substring(offset), "ascii");
				} else {
					setError("Data account is static so cannot be realloced");
					return;
				}
			} else {
				const oldUpdate = Buffer.from(updated.substring(offset), "ascii");
				updateData = Buffer.concat([
					oldUpdate,
					Buffer.from(new Uint8Array(old.length - updated.length)),
				]);
			}

			const PART_SIZE = 881;
			const parts = Math.ceil(updateData.length / PART_SIZE);
			const allTxs: Transaction[] = [];
			let recentBlockhash = await clusterConnection.getLatestBlockhash();

			let current = 0;
			while (current < parts) {
				const part = updateData.subarray(
					current * PART_SIZE,
					(current + 1) * PART_SIZE
				);
				const tx = uploadDataPart(
					authority,
					dataAccount,
					DataTypeOption.JSON,
					part,
					offset + current * PART_SIZE
				);
				tx.recentBlockhash = recentBlockhash.blockhash;
				allTxs.push(tx);
				++current;
			}

			let signedTxs = await signAllTransactions(allTxs);
			const completedTxs = new Set<number>();
			while (completedTxs.size < signedTxs.length) {
				await Promise.allSettled(
					handleUpload(clusterConnection, recentBlockhash, signedTxs, (tx) =>
						completedTxs.add(signedTxs.indexOf(tx))
					)
				).then(async (p) => {
					const rejected = p.filter((r) => r.status === "rejected");
					if (rejected.length === 0) return;
					rejected.forEach((rej) => {
						if (rej.status === "rejected") {
							console.log(Object.entries(rej.reason));
							console.log("rejected", rej.reason);
						}
					});
					// remake and sign all incomplete txs with new blockhash
					recentBlockhash = await clusterConnection.getLatestBlockhash();
					const allTxs: Transaction[] = [];
					let current = 0;
					while (current < parts) {
						if (completedTxs.has(current)) {
							++current;
							continue;
						}
						const part = updateData.subarray(
							offset + current * PART_SIZE,
							offset + (current + 1) * PART_SIZE
						);
						const tx = uploadDataPart(
							authority,
							dataAccount,
							DataTypeOption.JSON,
							part,
							offset + current * PART_SIZE
						);
						tx.recentBlockhash = recentBlockhash.blockhash;
						allTxs.push(tx);
						++current;
					}
					signedTxs = await signAllTransactions(allTxs);
				});
			}
			setSaveState("Saved");
			refresh();
		} catch (err) {
			if (err instanceof Error) {
				setError(err.message);
			}
		}
	};

	return (
		<div className="mt-2 justify-end relative leading-3 text-[0.5rem] sm:text-xs lg:text-sm">
			<div className="pb-3 flex gap-1 flex-col-reverse sm:gap-0 sm:flex-row sm:pb-0 sm:absolute sm:top-2 sm:z-10 sm:right-2 sm:inline-flex">
				{meta.dataStatus != DataStatusOption.FINALIZED && error && (
					<p className="text-rose-500 mr-2 leading-3 text-[0.5rem] sm:text-xs lg:text-sm">
						{error}
					</p>
				)}
				{meta.dataStatus != DataStatusOption.FINALIZED && unsavedChanges && (
					<div className="flex flex-col gap-1 sm:gap-0 sm:flex-row pt-2 sm:pt-0">
						<button
							className="text-xs md:text-sm lg:text-base mr-1 lg:mr-2 py-0 lg:py-0.5 px-1 lg:px-2 rounded-md bg-emerald-500 dark:bg-solana-green/80 hover:bg-emerald-700 dark:hover:bg-emerald-600 focus:bg-emerald-700 dark:focus:bg-emerald-600 text-white focus:outline-none"
							onClick={() => handleSave()}
						>
							{saveState}
						</button>
						<button
							className="text-xs md:text-sm lg:text-base mr-1 lg:mr-2 py-0 lg:py-0.5 px-1 lg:px-2 rounded-md bg-rose-500 hover:bg-rose-700 focus:bg-rose-700 sm:bg-rose-500/70 sm:hover:bg-rose-700/90 sm:focus:bg-rose-700/90 focus:outline-none text-white"
							onClick={() => handleCancel()}
						>
							Cancel
						</button>
					</div>
				)}
				<div className="w-full inline-flex">
					<p className="text-solana-purple text-xs md:text-sm lg:text-base pr-1 lg:pr-2">
						Theme:
					</p>
					<select
						className="text-black text-xs md:text-sm lg:text-base w-full p-0.5 lg:p-1 bg-white dark:bg-stone-200 rounded-sm focus:outline-none shadow-sm focus-within:ring-2 hover:ring-solana-purple focus:ring-solana-purple ring-2 ring-stone-400"
						required
						aria-required
						value={editorTheme}
						onChange={(e) => setEditorTheme(e.target.value)}
					>
						{EditorThemeKeys.map((label, idx) => {
							return (
								<option key={idx} value={label}>
									{label}
								</option>
							);
						})}
					</select>
				</div>
			</div>
			<ReactJsonDynamic
				src={data}
				name={null}
				style={{
					padding: "0.5rem",
					borderRadius: "0.5rem",
					overflowX: "auto",
				}}
				theme={EditorThemeMap.get(editorTheme)}
				iconStyle="square"
				onEdit={
					meta.dataStatus != DataStatusOption.FINALIZED
						? (e) => setData(e.updated_src)
						: undefined
				}
				onAdd={
					meta.dataStatus != DataStatusOption.FINALIZED
						? (e) => setData(e.updated_src)
						: undefined
				}
				onDelete={
					meta.dataStatus != DataStatusOption.FINALIZED
						? (e) => setData(e.updated_src)
						: undefined
				}
			/>
		</div>
	);
};

export default JSONDisplay;
