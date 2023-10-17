import { ClusterNames, DataAccountWithMeta } from "@/app/utils/types";
import { useCluster } from "@/app/utils/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, Transaction } from "@solana/web3.js";
import { useMemo, useState } from "react";
import { DataProgram, DataStatusOption } from "solana-data-program";
import ActionModal from "../helpers/action-modal";
import Tooltip from "../helpers/tooltip";

const FinalizeAllAction = ({
	rows,
	refresh,
	disableTooltip,
	classes,
}: {
	rows: DataAccountWithMeta[];
	refresh: () => void;
	disableTooltip?: boolean;
	classes?: string;
}) => {
	const { cluster } = useCluster();
	const { publicKey: authority, signTransaction } = useWallet();

	const [error, setError] = useState<string | null>(null);
	const [finalizeState, setFinalizeState] = useState("Finalize All");
	const [showModal, setShowModal] = useState(false);

	const isAuthority = useMemo(
		() =>
			authority &&
			!rows.find((row) => row.meta.authority != authority.toBase58()),
		[authority, rows]
	);

	const handleFinalizeConfirmed = async () => {
		if (rows.find((row) => !row.pubkey.toBase58())) {
			setError("Invalid data account");
			return;
		}

		if (
			!authority ||
			rows.find((row) => row.meta.authority != authority.toBase58()) ||
			!signTransaction
		) {
			setError(
				"Invalid authority wallet. Please sign in to wallet to continue..."
			);
			return;
		}

		try {
			setFinalizeState("Finalizing...");
			setError(null);

			const clusterURL = Object.values(ClusterNames).find(
				({ name }) => name === cluster
			)?.url;
			if (!clusterURL) {
				setError("Invalid cluster");
				return;
			}

			const finalizedRows = rows.filter(
				(row) => row.meta.dataStatus === DataStatusOption.FINALIZED
			);
			if (finalizedRows.length > 0) {
				if (finalizedRows.length === 1) {
					setError(
						`Data account ${finalizedRows[0].pubkey.toBase58()} is already finalized`
					);
					return;
				}
				setError("More than one data account is already finalized");
				return;
			}

			const clusterConnection = new Connection(clusterURL);
			const recentBlockhash = await clusterConnection.getLatestBlockhash();
			const tx = new Transaction();
			rows.forEach(({ pubkey }) => {
				const ix = DataProgram.finalizeDataAccount(authority, pubkey, false);
				tx.add(ix);
			});
			tx.recentBlockhash = recentBlockhash.blockhash;
			tx.feePayer = authority;
			const signed = await signTransaction(tx);
			const txid = await clusterConnection.sendRawTransaction(
				signed.serialize()
			);
			await clusterConnection
				.confirmTransaction(
					{
						blockhash: recentBlockhash.blockhash,
						lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
						signature: txid,
					},
					"confirmed"
				)
				.then(() => {
					console.log(
						`finalized: https://explorer.solana.com/tx/${txid}?cluster=devnet`
					);
				});
			setFinalizeState("Finalized");
			refresh();
		} catch (err) {
			if (err instanceof Error) {
				setError(err.message);
			}
		}
	};

	const handleFinalize = () => {
		if (rows.find((row) => !row.pubkey.toBase58())) {
			setError("Invalid data account");
			return;
		}

		if (
			!authority ||
			rows.find((row) => row.meta.authority != authority.toBase58()) ||
			!signTransaction
		) {
			setError(
				"Invalid authority wallet. Please sign in to wallet to continue..."
			);
			return;
		}

		setShowModal(true);
	};

	return (
		<div className={`flex items-center mt-1 ${classes ? classes : ""}`}>
			<button
				className="w-full px-1 lg:px-2 rounded-md bg-emerald-500 dark:bg-solana-green/80 hover:bg-emerald-700 dark:hover:bg-emerald-600 focus:bg-emerald-700 dark:focus:bg-emerald-600 focus:outline-none text-white disabled:bg-stone-500 disabled:dark:bg-stone-500 disabled:cursor-not-allowed"
				onClick={() => handleFinalize()}
				disabled={!isAuthority}
				title={
					isAuthority
						? "This action finalizes the data in the selected account(s) to prevent future updates"
						: "Login as Authority wallet to finalize data account(s)"
				}
			>
				<span className="text-xs md:text-sm lg:text-base">{finalizeState}</span>
			</button>
			{!disableTooltip && (
				<Tooltip
					message={
						<>
							{isAuthority
								? "This action finalizes the data in the account(s) to prevent future updates"
								: "Login as Authority wallet to finalize data account(s)"}
						</>
					}
					condition={true}
					classes={`w-32 lg:w-44 top-7 right-0 md:top-5 lg:top-0 lg:left-9`}
				>
					<svg
						className="ml-1 lg:ml-2 w-4 h-4 lg:w-5 lg:h-5 text-emerald-500 dark:text-solana-green group-hover:text-emerald-700 dark:group-hover:text-emerald-600 group-focus:text-emerald-700 dark:group-focus:text-emerald-600"
						fill="none"
						stroke="currentColor"
						strokeWidth={1.5}
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
						/>
					</svg>
				</Tooltip>
			)}
			{error && (
				<p className="text-xs md:text-sm lg:text-base ml-3 lg:ml-5 text-rose-500">
					{error}
				</p>
			)}
			<ActionModal
				showModal={showModal}
				message={
					<>
						Are you sure you want to finalize {rows.length} account
						{rows.length > 1 ? "s" : ""}?
						<br /> Finalized data can no longer be updated
					</>
				}
				cancel={"No, Cancel"}
				confirm={"Yes, I'm sure! Finalize the data"}
				handleCloseModal={() => setShowModal(false)}
				handleSaveChanges={() => {
					handleFinalizeConfirmed();
					setShowModal(false);
				}}
			/>
		</div>
	);
};

export default FinalizeAllAction;
