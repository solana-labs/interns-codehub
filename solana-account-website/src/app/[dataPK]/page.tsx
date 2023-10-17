"use client";

import Loading from "@/app/components/loading";
import { ApiError } from "@/app/utils/types";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DataTypeOption, IDataAccountMeta } from "solana-data-program";
import DataDisplay from "../components/[dataPK]/display-data/display-data";
import MetadataDisplay from "../components/[dataPK]/display-metadata/display-metadata";

const DataAccountInfoPage = () => {
	const pathname = usePathname();
	const dataPK = pathname?.substring(1);
	const searchParams = useSearchParams();

	const [dataType, setDataType] = useState<DataTypeOption>(
		DataTypeOption.CUSTOM
	);
	const [loading, setLoading] = useState(false);
	const [dataAccountMeta, setDataAccountMeta] = useState<IDataAccountMeta>(
		{} as IDataAccountMeta
	);
	const [dirty, setDirty] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!dirty) {
			return;
		}

		setLoading(true);
		fetch(`/api/meta/${pathname}?${searchParams.toString()}`)
			.then((res) => {
				if (!res.ok) {
					res.json().then(({ error }: ApiError) => {
						setError(error);
					});
				} else {
					res.json().then((account_meta: IDataAccountMeta) => {
						setDataAccountMeta(account_meta);
						setDataType(account_meta.dataType);
						setDirty(false);
						setError(null);
					});
				}
			})
			.catch((err) => {
				if (err instanceof Error) {
					setError(err.message);
				}
			})
			.finally(() => setLoading(false));
	}, [pathname, searchParams, dirty]);

	const handleRefresh = () => {
		setDirty(true);
		console.log("refreshed");
	};

	if (loading) {
		return <Loading />;
	}

	return (
		<div className="pb-2">
			<MetadataDisplay
				meta={dataAccountMeta}
				dataType={dataType}
				setDataType={setDataType}
				handleRefresh={handleRefresh}
				error={error}
			/>
			<DataDisplay
				data_type={dataType}
				dataPK={dataPK}
				searchParams={searchParams.toString()}
				meta={dataAccountMeta}
			/>
		</div>
	);
};

export default DataAccountInfoPage;
