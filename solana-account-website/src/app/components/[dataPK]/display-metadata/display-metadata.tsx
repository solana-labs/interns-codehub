import { getBaseURL } from "@/app/utils/utils";
import { usePathname, useSearchParams } from "next/navigation";
import { Dispatch, SetStateAction } from "react";
import { DataTypeOption, IDataAccountMeta } from "solana-data-program";
import AuthorityRow from "./authority-row";
import DataRow from "./data-row";
import DataAccountRow from "./dataaccount-row";
import DataStatusRow from "./datastatus-row";
import DataTypeRow from "./datatype-row";
import DynamicRow from "./dynamic-row";
import SerializationRow from "./serialization-row";

const MetadataDisplay = ({
	meta,
	handleRefresh,
	dataType,
	setDataType,
	error,
}: {
	meta: IDataAccountMeta;
	dataType: DataTypeOption;
	setDataType: Dispatch<SetStateAction<DataTypeOption>>;
	handleRefresh: () => void;
	error: string | null;
}) => {
	const pathname = usePathname();
	const dataPK = pathname?.substring(1);
	const searchParams = useSearchParams();

	if (error) {
		return (
			<div>
				<h1 className="text-sm lg:text-base">
					<p className="text-rose-500 font-semibold">ERROR:</p>
					{error}
				</h1>
			</div>
		);
	}

	return (
		<div className="grid grid-rows-7 md:grid-rows-8 w-full h-full">
			<DataAccountRow dataPK={dataPK} classes="row-start-1 row-end-2" />
			<AuthorityRow
				authority={meta.authority}
				classes="row-start-2 row-end-3"
			/>
			<DataStatusRow
				dataPK={dataPK}
				meta={meta}
				refresh={handleRefresh}
				classes="row-start-3 row-end-4"
			/>
			<SerializationRow
				serialization_status={meta.serializationStatus}
				classes="row-start-4 row-end-5"
			/>
			<DynamicRow is_dynamic={meta.isDynamic} classes="row-start-5 row-end-6" />
			<DataTypeRow
				data_type={meta.dataType}
				dataType={dataType}
				setDataType={setDataType}
				classes="row-start-6 row-end-7"
			/>
			<DataRow
				url={`${getBaseURL()}/api/data${pathname}?${searchParams.toString()}`}
				classes="row-start-7 row-end-8"
			/>
		</div>
	);
};

export default MetadataDisplay;
