"use client";

import { useEffect } from "react";

const ErrorBoundary = ({ error }: { error: Error; reset: () => void }) => {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div>
			<h1 className="text-sm lg:text-base">
				<p className="text-rose-500 font-semibold">ERROR:</p>
				{error.message}
			</h1>
		</div>
	);
};

export default ErrorBoundary;
