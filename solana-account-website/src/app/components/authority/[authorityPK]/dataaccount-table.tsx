import { DataAccountWithMeta } from "@/app/utils/types";
import { TableInstance } from "react-table";
import ColumnSorter from "./column-sorter";

const DataAccountTable = ({
	table,
}: {
	table: TableInstance<DataAccountWithMeta>;
}) => {
	const { getTableProps, headerGroups, getTableBodyProps, prepareRow, page } =
		table;

	return (
		<div className="overflow-x-auto rounded-t-lg">
			<table
				className="table-auto border-collapse w-full shadow-xl bg-white dark:bg-stone-800"
				{...getTableProps}
			>
				<thead className="text-sm lg:text-base text-stone-700 dark:text-stone-200 bg-stone-200 dark:bg-stone-900 text-center uppercase">
					{headerGroups.map((headerGroup) => {
						const { key, ...restHeaderGroupProps } =
							headerGroup.getHeaderGroupProps();
						return (
							<tr key={key} {...restHeaderGroupProps}>
								{headerGroup.headers.map((column) => {
									const { key, ...restHeaderProps } = column.getHeaderProps(
										column.getSortByToggleProps()
									);
									return (
										<th
											key={key}
											className="p-1 lg:p-2 flex justify-center"
											{...restHeaderProps}
										>
											{column.render("Header")}
											<ColumnSorter column={column} />
										</th>
									);
								})}
							</tr>
						);
					})}
				</thead>
				<tbody {...getTableBodyProps()}>
					{page.map((row) => {
						prepareRow(row);
						const { key, ...restRowProps } = row.getRowProps();
						return (
							<tr
								key={key}
								className={`text-xs lg:text-sm text-center border-b dark:border-stone-600 ${
									row.isSelected ? "bg-stone-100 dark:bg-stone-700 " : ""
								}hover:bg-stone-100 focus-within:bg-stone-100 dark:hover:bg-stone-700 dark:focus-within:bg-stone-700`}
								{...restRowProps}
							>
								{row.cells.map((cell) => {
									const { key, ...restCellProps } = cell.getCellProps();
									return (
										<td key={key} className="p-1 lg:p-2" {...restCellProps}>
											{cell.render("Cell")}
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};

export default DataAccountTable;
