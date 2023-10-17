import { ForwardedRef, HTMLProps, forwardRef, useEffect, useRef } from "react";

type RowCheckboxProps = {
	indeterminate?: boolean;
	[key: string]: unknown;
} & HTMLProps<HTMLInputElement>;

const RowCheckbox = forwardRef<HTMLInputElement, RowCheckboxProps>(
	function RowCheckbox(
		{ indeterminate, onChange, ...rest },
		ref: ForwardedRef<HTMLInputElement>
	) {
		const defaultRef = useRef<HTMLInputElement>(null);
		const resolvedRef = ref || defaultRef;

		useEffect(() => {
			if ("current" in resolvedRef && resolvedRef.current !== null) {
				resolvedRef.current.indeterminate = indeterminate || false;
			}
		}, [resolvedRef, indeterminate]);

		return (
			<div className="mr-4">
				<input
					className="w-3 h-3 lg:w-3.5 lg:h-3.5 accent-emerald-500 dark:accent-solana-green hover:ring-violet-700 dark:hover:ring-solana-purple hover:ring-2 focus:ring-2 focus:ring-violet-700 dark:focus:ring-solana-purple"
					type="checkbox"
					ref={resolvedRef}
					onChange={onChange}
					{...rest}
				/>
			</div>
		);
	}
);

RowCheckbox.displayName = "RowCheckbox";

export default RowCheckbox;
