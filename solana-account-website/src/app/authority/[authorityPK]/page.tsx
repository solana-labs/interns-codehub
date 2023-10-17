"use client";

import CloseAction from "@/app/components/actions/close-action";
import FinalizeAction from "@/app/components/actions/finalize-action";
import CopyToClipboard from "@/app/components/helpers/copy";
import Loading from "@/app/components/loading";
import { Connection } from "@solana/web3.js";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Column, Row } from "react-table";
import { DataStatusOption, DataTypeOption } from "solana-data-program";
import { ClusterNames, DataAccountWithMeta } from "../../utils/types";
import {
	getBaseURL,
	getDataAccountsByAuthority,
	useCluster,
} from "../../utils/utils";

const DynamicDataAccountTableDiv = dynamic(
	() => import("@/app/components/authority/[authorityPK]/dataaccount-table-div")
);

const AuthorityPage = () => {
	const { cluster } = useCluster();
	const pathname = usePathname();
	const authorityPK = pathname?.substring(11);
	const searchParams = useSearchParams();
	const [accounts, setAccounts] = useState<DataAccountWithMeta[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dirty, setDirty] = useState(true);

	const displayAddress = (base58: string) => {
		return base58.slice(0, 10) + ".." + base58.slice(-10);
	};

	const handleRefresh = () => {
		setDirty(true);
		console.log("refreshed");
	};

	const columns = useMemo<Column<DataAccountWithMeta>[]>(
		() => [
			{
				Header: "Data Account",
				accessor: "pubkey",
				Cell: ({ cell: { value: pubkey } }) => (
					<div className="flex flex-row items-center justify-center">
						<Link
							className="font-mono hover:text-violet-700 dark:hover:text-solana-purple focus:text-violet-700 dark:focus:text-solana-purple focus:ring-0 appearance-none focus:outline-none"
							href={`${getBaseURL()}/${pubkey.toBase58()}?${searchParams.toString()}`}
						>
							{displayAddress(pubkey.toBase58())}
						</Link>
						<CopyToClipboard message={pubkey.toBase58()} />
					</div>
				),
				defaultCanSort: true,
				sortType: (rowA, rowB, id) => {
					if (rowA.values[id].toBase58() > rowB.values[id].toBase58()) {
						return 1;
					}
					if (rowB.values[id].toBase58() > rowA.values[id].toBase58()) {
						return -1;
					}
					return 0;
				},
			},
			{
				Header: "Data Type",
				id: "data-type",
				accessor: "meta",
				Cell: ({ cell: { value: meta } }) => (
					<p className="text-stone-500">{DataTypeOption[meta.dataType]}</p>
				),
				defaultCanSort: true,
				sortType: (rowA, rowB, id) => {
					if (rowA.values[id].dataType > rowB.values[id].dataType) {
						return 1;
					}
					if (rowB.values[id].dataType > rowA.values[id].dataType) {
						return -1;
					}
					return 0;
				},
			},
			{
				Header: "Data Status",
				id: "data-status",
				accessor: "meta",
				Cell: ({ cell: { value: meta } }) => (
					<p
						className={
							meta.dataStatus === DataStatusOption.INITIALIZED
								? "text-emerald-500 dark:text-solana-green"
								: "text-rose-500"
						}
					>
						{DataStatusOption[meta.dataStatus]}
					</p>
				),
				defaultCanSort: true,
				sortType: (rowA, rowB, id) => {
					if (rowA.values[id].dataStatus > rowB.values[id].dataStatus) {
						return 1;
					}
					if (rowB.values[id].dataStatus > rowA.values[id].dataStatus) {
						return -1;
					}
					return 0;
				},
			},
			{
				Header: "Actions",
				id: "actions",
				accessor: (originalRow) => originalRow,
				Cell: ({
					row: {
						original: { pubkey, meta },
					},
				}: {
					row: Row<DataAccountWithMeta>;
				}) => (
					<div className="w-full grid grid-cols-2 gap-x-3">
						{meta.dataStatus != DataStatusOption.FINALIZED && (
							<FinalizeAction
								dataPK={pubkey.toBase58()}
								meta={meta}
								refresh={handleRefresh}
								disableTooltip={true}
								classes="justify-end"
							/>
						)}
						<CloseAction
							dataPK={pubkey.toBase58()}
							meta={meta}
							refresh={handleRefresh}
							disableTooltip={true}
							classes="col-start-2"
						/>
					</div>
				),
				disableSortBy: true,
			},
		],
		[searchParams]
	);

	const data = useMemo(() => accounts, [accounts]);

	useEffect(() => {
		if (!dirty) {
			return;
		}

		setLoading(true);
		setError(null);
		const clusterURL = Object.values(ClusterNames).find(
			({ name }) => name.toLowerCase() === cluster?.toString().toLowerCase()
		)?.url;
		if (!clusterURL) {
			setError("Invalid Cluster");
			return;
		}
		if (!authorityPK) {
			setError("No Authority provided");
			return;
		}
		const connection = new Connection(clusterURL, "confirmed");
		getDataAccountsByAuthority(connection, authorityPK)
			.then((data) => {
				const dataAccountsWithMeta = data.map(({ pubkey, meta }) => ({
					pubkey,
					meta,
				}));
				setAccounts(dataAccountsWithMeta);
				setError(null);
				setDirty(false);
			})
			.catch((err) => {
				if (err instanceof Error) {
					setError(err.message);
				}
			})
			.finally(() => setLoading(false));
	}, [authorityPK, cluster, dirty]);

	if (loading) {
		return <Loading />;
	}

	if (error) {
		return (
			<div>
				<h1 className="text-sm lg:text-base">
					<p className="text-rose-500 font-semibold">ERROR: </p>
					{error}
				</h1>
			</div>
		);
	}

	return (
		<DynamicDataAccountTableDiv
			columns={columns}
			data={data}
			refresh={handleRefresh}
		/>
	);
};

export default AuthorityPage;
