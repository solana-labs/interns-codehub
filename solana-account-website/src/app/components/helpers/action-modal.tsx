import { ReactNode, useEffect, useRef } from "react";

const ActionModal = ({
	showModal,
	message,
	cancel,
	confirm,
	handleCloseModal,
	handleSaveChanges,
}: {
	showModal: boolean;
	message: ReactNode;
	cancel: string;
	confirm: string;
	handleCloseModal: () => void;
	handleSaveChanges: () => void;
}) => {
	const cancelRef = useRef<HTMLButtonElement>(null);
	const confirmRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const handleFocusTrap = (e: KeyboardEvent) => {
			if (!cancelRef?.current || !confirmRef?.current) {
				return;
			}

			const isTabPressed = e.key === "Tab";

			if (!isTabPressed) {
				return;
			}

			if (e.shiftKey) {
				if (document.activeElement === cancelRef.current) {
					confirmRef.current.focus();
					e.preventDefault();
				}
			} else {
				if (document.activeElement === confirmRef.current) {
					cancelRef.current.focus();
					e.preventDefault();
				}
			}
		};

		document.addEventListener("keydown", handleFocusTrap);
		return () => {
			document.removeEventListener("keydown", handleFocusTrap);
		};
	}, [cancelRef, confirmRef]);

	return showModal ? (
		<div role="dialog" className="aria-hidden">
			<div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none">
				<div className="relative w-auto mb-6 mx-auto max-w-3xl">
					<div className="border-0 rounded-lg shadow-sm relative flex flex-col w-full bg-white dark:bg-stone-200 outline-none focus:outline-none">
						<div className="relative p-3 flex-auto">
							<svg
								aria-hidden="true"
								className="mx-auto h-10 w-10 xs:h-12 xs:w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 text-black"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								></path>
							</svg>
							<p className="text-black text-sm xs:text-base lg:text-lg">
								{message}
							</p>
						</div>
						<div className="flex flex-col gap-1 xs:flex-row xs:gap-2 items-center justify-end p-2 lg:p-3 border-t border-solid border-stone-500 dark:border-stone-400 rounded-b">
							<button
								ref={cancelRef}
								className="w-full xs:w-auto px-1 lg:px-2 py-0.5 lg:py-1 rounded-md bg-rose-500 hover:bg-rose-700 focus:bg-rose-700 focus:outline-none text-white ease-linear transition-all duration-200"
								onClick={() => handleCloseModal()}
								autoFocus
							>
								<span className="text-xs xs:text-sm sm:text-base lg:text-lg">
									{cancel}
								</span>
							</button>
							<button
								ref={confirmRef}
								className="w-full xs:w-auto px-1 lg:px-2 py-0.5 lg:py-1 rounded-md bg-emerald-500 hover:bg-emerald-700 focus:bg-emerald-700 focus:outline-none text-white ease-linear transition-all duration-200"
								onClick={() => handleSaveChanges()}
							>
								<span className="text-xs xs:text-sm sm:text-base lg:text-lg">
									{confirm}
								</span>
							</button>
						</div>
					</div>
				</div>
			</div>
			<div className="opacity-50 fixed inset-0 z-40 bg-black"></div>
		</div>
	) : null;
};

export default ActionModal;
