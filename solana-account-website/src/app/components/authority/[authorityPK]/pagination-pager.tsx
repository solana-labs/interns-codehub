import { DataAccountWithMeta } from "@/app/utils/types";
import { TableInstance } from "react-table";

const PaginationPager = ({
	table,
	pageIndices,
}: {
	table: TableInstance<DataAccountWithMeta>;
	pageIndices: number[];
}) => {
	const {
		canPreviousPage,
		canNextPage,
		pageOptions,
		pageCount,
		gotoPage,
		nextPage,
		previousPage,
		state: { pageIndex },
	} = table;

	return (
		<ul className="inline-flex items-start -space-x-1">
			<li>
				<button
					className="py-0.5 px-1 lg:py-1 lg:px-2 leading-3 text-[0.5rem] xs:text-xs lg:text-sm rounded-l-lg border bg-white dark:bg-stone-800 border-stone-500 text-stone-500 hover:bg-stone-200 hover:border-violet-700 hover:text-violet-700 dark:hover:bg-stone-900 dark:hover:border-solana-purple dark:hover:text-solana-purple ease-in-out duration-50 focus:bg-stone-200 focus:border-violet-700 focus:text-violet-700 dark:focus:bg-stone-900 dark:focus:border-solana-purple dark:focus:text-solana-purple focus:ring-0 appearance-none focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-300 disabled:text-stone-800 dark:disabled:text-stone-500 disabled:border-stone-500 dark:disabled:border-stone-500"
					onClick={() => gotoPage(0)}
					disabled={!canPreviousPage}
				>
					First
				</button>
			</li>
			<li>
				<button
					className="py-0.5 px-1 lg:py-1 lg:px-2 leading-3 text-[0.5rem] xs:text-xs lg:text-sm border bg-white dark:bg-stone-800 border-stone-500 text-stone-500 hover:bg-stone-200 hover:border-violet-700 hover:text-violet-700 dark:hover:bg-stone-900 dark:hover:border-solana-purple dark:hover:text-solana-purple ease-in-out duration-50 focus:bg-stone-200 focus:border-violet-700 focus:text-violet-700 dark:focus:bg-stone-900 dark:focus:border-solana-purple dark:focus:text-solana-purple focus:ring-0 appearance-none focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-300 disabled:text-stone-800 dark:disabled:text-stone-500 disabled:border-stone-500 dark:disabled:border-stone-500"
					onClick={() => previousPage()}
					disabled={!canPreviousPage}
				>
					Prev
				</button>
			</li>
			{pageOptions.slice(pageIndices[0], pageIndices[1]).map((pageNum) => {
				return (
					<li key={pageNum}>
						<button
							className={`p-0.5 lg:p-1 w-7 lg:w-8 leading-3 text-[0.5rem] xs:text-xs lg:text-sm border ${
								pageNum === pageIndex
									? "bg-stone-200 border-violet-700 text-violet-700 dark:bg-stone-900 dark:border-solana-purple dark:text-solana-purple"
									: "border-stone-500 text-stone-500 bg-white dark:bg-stone-800"
							} hover:bg-stone-200 hover:border-violet-700 hover:text-violet-700 dark:hover:bg-stone-900 dark:hover:border-solana-purple dark:hover:text-solana-purple ease-in-out duration-50 focus:bg-stone-200 focus:border-violet-700 focus:text-violet-700 dark:focus:bg-stone-900 dark:focus:border-solana-purple dark:focus:text-solana-purple focus:ring-0 appearance-none focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-300 disabled:text-stone-800 dark:disabled:text-stone-500 disabled:border-stone-500 dark:disabled:border-stone-500`}
							onClick={() => gotoPage(pageNum)}
						>
							{pageNum + 1}
						</button>
					</li>
				);
			})}
			<li>
				<button
					className="py-0.5 px-1 lg:py-1 lg:px-2 leading-3 text-[0.5rem] xs:text-xs lg:text-sm border bg-white dark:bg-stone-800 border-stone-500 text-stone-500 hover:bg-stone-200 hover:border-violet-700 hover:text-violet-700 dark:hover:bg-stone-900 dark:hover:border-solana-purple dark:hover:text-solana-purple ease-in-out duration-50 focus:bg-stone-200 focus:border-violet-700 focus:text-violet-700 dark:focus:bg-stone-900 dark:focus:border-solana-purple dark:focus:text-solana-purple focus:ring-0 appearance-none focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-300 disabled:text-stone-800 dark:disabled:text-stone-500 disabled:border-stone-500 dark:disabled:border-stone-500"
					onClick={() => nextPage()}
					disabled={!canNextPage}
				>
					Next
				</button>
			</li>
			<li>
				<button
					className="py-0.5 px-1 lg:py-1 lg:px-2 leading-3 text-[0.5rem] xs:text-xs lg:text-sm rounded-r-lg border bg-white dark:bg-stone-800 border-stone-500 text-stone-500 hover:bg-stone-200 hover:border-violet-700 hover:text-violet-700 dark:hover:bg-stone-900 dark:hover:border-solana-purple dark:hover:text-solana-purple ease-in-out duration-50 focus:bg-stone-200 focus:border-violet-700 focus:text-violet-700 dark:focus:bg-stone-900 dark:focus:border-solana-purple dark:focus:text-solana-purple focus:ring-0 appearance-none focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-300 disabled:text-stone-800 dark:disabled:text-stone-500 disabled:border-stone-500 dark:disabled:border-stone-500"
					onClick={() => gotoPage(pageCount - 1)}
					disabled={!canNextPage}
				>
					Last
				</button>
			</li>
		</ul>
	);
};

export default PaginationPager;
