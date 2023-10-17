import { Dispatch, SetStateAction } from "react";
import { DataTypeOption } from "solana-data-program";
import DataTypeSelect from "../../upload/datatype-select";

const DataTypeRow = ({
	data_type,
	dataType,
	setDataType,
	classes,
}: {
	data_type: DataTypeOption;
	dataType: DataTypeOption;
	setDataType: Dispatch<SetStateAction<DataTypeOption>>;
	classes?: string;
}) => {
	return (
		<div
			className={`grid grid-flow-row auto-rows-min grid-cols-1 sm:grid-cols-12 ${classes}`}
		>
			<div className="flex flex-row pb-1 sm:pb-0 col-span-3 items-center text-sm sm:font-bold sm:text-base lg:text-lg text-left text-violet-700 dark:text-solana-purple">
				<span>Data Type</span>
				<span className="flex sm:hidden w-fit py-1 pl-2 text-stone-500 dark:text-stone-200">
					:
				</span>
			</div>
			<div className="w-fit hidden col-span-1 sm:flex sm:p-1 lg:p-2 text-stone-500 dark:text-stone-200">
				:
			</div>
			<div className="pb-4 sm:pb-0 flex items-center col-span-8">
				<span className="text-sm lg:text-base">
					{DataTypeOption[data_type]}
				</span>
				<DataTypeSelect
					dataType={dataType}
					setDataType={setDataType}
					classes="ml-3"
				/>
			</div>
		</div>
	);
};

export default DataTypeRow;
