import { DataAccountWithMeta } from "@/app/utils/types";
import {
	Row,
	TableOptions,
	useFlexLayout,
	usePagination,
	useRowSelect,
	useSortBy,
	useTable,
} from "react-table";
import DataAccountTable from "./dataaccount-table";
import PaginationNav from "./pagination-nav";
import RowCheckbox from "./row-checkbox";
import RowSelectActions from "./row-select-actions";

const DataAccountTableDiv = ({
	columns,
	data,
	refresh,
}: TableOptions<DataAccountWithMeta> & { refresh: () => void }) => {
	const tableInstance = useTable(
		{ columns, data },
		useSortBy,
		usePagination,
		useRowSelect,
		useFlexLayout,
		(hooks) => {
			hooks.visibleColumns.push((columns) => [
				{
					id: "select",
					width: "2rem",
					Header: ({ getToggleAllPageRowsSelectedProps }) => {
						return (
							<div className="px-1">
								<RowCheckbox {...getToggleAllPageRowsSelectedProps()} />
							</div>
						);
					},
					Cell: ({ row }: { row: Row<DataAccountWithMeta> }) => (
						<div className="px-1">
							<RowCheckbox {...row.getToggleRowSelectedProps()} />
						</div>
					),
					disableSortBy: true,
				},
				...columns,
			]);
		}
	);

	if (data.length === 0) {
		return (
			<h1 className="text-sm xs:text-base lg:text-lg">
				Given <code>Authority</code> has no data accounts associated with it
			</h1>
		);
	}

	return (
		<div className="grow h-full flex flex-col justify-between">
			<div>
				<DataAccountTable table={tableInstance} />
				<RowSelectActions
					selectedFlatRows={tableInstance.selectedFlatRows}
					refresh={refresh}
				/>
			</div>
			<PaginationNav table={tableInstance} dataLen={data.length} />
		</div>
	);
};

export default DataAccountTableDiv;
