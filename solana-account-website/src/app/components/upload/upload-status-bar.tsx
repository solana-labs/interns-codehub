const UploadStatusBar = ({
	dataAccountStatus,
}: {
	dataAccountStatus: number;
}) => {
	return (
		<>
			{dataAccountStatus >= 0 && dataAccountStatus < 100 && (
				<div className="w-full sm:w-96 my-5 bg-white dark:bg-stone-200 rounded-md h-2 sm:h-5 ring-2 ring-stone-500 dark:ring-stone-400">
					<div
						className="px-1 ease-in duration-300 flex justify-center bg-emerald-500 dark:bg-solana-green h-2 sm:h-5 rounded-md ring-2 ring-emerald-700 dark:ring-emerald-600"
						style={{ width: `${Math.min(dataAccountStatus, 100)}%` }}
					>
						<span className="hidden sm:flex animate-[bounce_3s_infinite] text-xs sm:text-sm text-emerald-700 dark:text-emerald-600 overflow-hidden">
							Uploading...
						</span>
					</div>
				</div>
			)}
			{dataAccountStatus >= 100 && (
				<div className="text-xs sm:text-base mt-3 text-emerald-500 dark:text-solana-green/80">
					Upload Complete!
				</div>
			)}
		</>
	);
};

export default UploadStatusBar;
