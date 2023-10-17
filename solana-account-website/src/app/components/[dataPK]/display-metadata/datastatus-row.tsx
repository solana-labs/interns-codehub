import { DataStatusOption, IDataAccountMeta } from "solana-data-program";
import CloseAction from "../../actions/close-action";
import DataStatusActions from "../../actions/data-status-actions";
import FinalizeAction from "../../actions/finalize-action";

const DataStatusRow = ({
	dataPK,
	meta,
	refresh,
	classes,
}: {
	dataPK: string | undefined;
	meta: IDataAccountMeta;
	refresh: () => void;
	classes?: string;
}) => {
	return (
		<div
			className={`grid grid-flow-row auto-rows-min grid-cols-1 sm:grid-cols-12 ${classes}`}
		>
			<div className="flex flex-row pb-1 sm:pb-0 col-span-3 items-center text-sm sm:font-bold sm:text-base lg:text-lg text-left text-violet-700 dark:text-solana-purple">
				<span>Data Status</span>
				<span className="flex sm:hidden w-fit py-1 pl-2 text-stone-500 dark:text-stone-200">
					:
				</span>
			</div>
			<div className="w-fit items-center hidden col-span-1 sm:flex sm:p-1 lg:p-2 text-stone-500 dark:text-stone-200">
				:
			</div>
			<div className="pb-2 sm:pb-0 flex items-center col-span-8">
				<span
					className={`text-sm lg:text-base ${
						meta.dataStatus === DataStatusOption.INITIALIZED
							? "text-emerald-500 dark:text-solana-green"
							: "text-rose-500"
					}`}
				>
					{DataStatusOption[meta.dataStatus]}
				</span>
				{meta.dataStatus != undefined && (
					<DataStatusActions classes="hidden sm:flex ml-2 lg:ml-5">
						<div>
							{meta.dataStatus != DataStatusOption.FINALIZED && (
								<FinalizeAction dataPK={dataPK} meta={meta} refresh={refresh} />
							)}
							<CloseAction dataPK={dataPK} meta={meta} refresh={refresh} />
						</div>
					</DataStatusActions>
				)}
			</div>
			<div className="pb-4 flex flex-col items-center gap-2 w-full sm:hidden">
				<DataStatusActions classes="w-full">
					{meta.dataStatus != DataStatusOption.FINALIZED && (
						<FinalizeAction
							dataPK={dataPK}
							meta={meta}
							refresh={refresh}
							classes="w-full"
						/>
					)}
					<CloseAction
						dataPK={dataPK}
						meta={meta}
						refresh={refresh}
						classes="w-full"
					/>
				</DataStatusActions>
			</div>
		</div>
	);
};

export default DataStatusRow;
