import { DataAccountWithMeta } from "@/app/utils/types";
import {
	MAX_INACTIVE_PAGES_PER_SIDE,
	MAX_PAGES_TO_NAVIGATE,
	START_PAGE_INDICES,
} from "@/app/utils/utils";
import { useCallback, useEffect, useState } from "react";
import { TableInstance } from "react-table";
import PaginationPager from "./pagination-pager";
import PaginationShowRows from "./pagination-show-rows";

const PaginationNav = ({
	table,
	dataLen,
}: {
	table: TableInstance<DataAccountWithMeta>;
	dataLen: number;
}) => {
	const {
		pageOptions,
		pageCount,
		state: { pageIndex },
	} = table;

	const [pageIndices, setPageIndices] = useState(START_PAGE_INDICES);

	useEffect(() => {
		let start = Math.max(0, pageIndex - MAX_INACTIVE_PAGES_PER_SIDE);
		if (pageCount < start + MAX_PAGES_TO_NAVIGATE) {
			start = Math.max(0, pageCount - MAX_PAGES_TO_NAVIGATE);
		}
		setPageIndices([start, start + MAX_PAGES_TO_NAVIGATE]);
	}, [pageCount, pageIndex]);

	const resetPageIndices = useCallback(() => {
		setPageIndices(START_PAGE_INDICES);
	}, []);

	if (pageOptions.length === 0) {
		return null;
	}

	return (
		<nav
			className="w-full px-0 sm:px-2 flex flex-col gap-2 sm:flex-row sm:gap-0 items-center justify-between mt-1 sm:mt-4"
			aria-label="Table navigation"
		>
			<PaginationShowRows
				table={table}
				dataLen={dataLen}
				resetPageIndices={resetPageIndices}
			/>
			<PaginationPager table={table} pageIndices={pageIndices} />
		</nav>
	);
};

export default PaginationNav;
