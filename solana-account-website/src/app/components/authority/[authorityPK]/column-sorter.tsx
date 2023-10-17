import { DataAccountWithMeta } from "@/app/utils/types";
import { HeaderGroup } from "react-table";

const ColumnSorter = ({
	column,
}: {
	column: HeaderGroup<DataAccountWithMeta>;
}) => {
	if (!column.canSort) {
		return null;
	}

	return (
		<button className="ml-0.5 lg:ml-1 flex items-center appearance-none focus:outline-none hover:text-solana-purple hover:dark:text-solana-purple focus:text-solana-purple focus:dark:text-solana-purple">
			{column.isSorted ? (
				column.isSortedDesc ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={2.5}
						stroke="currentColor"
						className="w-4 h-2 lg:w-5 lg:h-3"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M19.5 8.25l-7.5 7.5-7.5-7.5"
						/>
					</svg>
				) : (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth={2.5}
						stroke="currentColor"
						className="w-4 h-2 lg:w-5 lg:h-3"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M4.5 15.75l7.5-7.5 7.5 7.5"
						/>
					</svg>
				)
			) : (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={1.5}
					stroke="currentColor"
					className="w-4 h-4 lg:w-5 lg:h-5"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
					/>
				</svg>
			)}
		</button>
	);
};

export default ColumnSorter;
