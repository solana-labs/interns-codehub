import { Dispatch, SetStateAction } from "react";

const AuthorityRow = ({
	authority,
	setAuthority,
}: {
	authority: string;
	setAuthority: Dispatch<SetStateAction<string>>;
}) => {
	return (
		<div className="grid grid-flow-row auto-rows-min grid-cols-1 sm:grid-cols-12">
			<div className="flex flex-row pb-1 sm:pb-0 col-span-5 items-center text-sm sm:font-bold sm:text-base lg:text-lg text-left text-violet-700 dark:text-solana-purple">
				<span>
					Authority <code>PublicKey</code>
				</span>
				<span className="flex sm:hidden w-fit py-1 pl-2 text-stone-500 dark:text-stone-200">
					:
				</span>
			</div>
			<div className="w-fit hidden col-span-1 sm:flex sm:p-1 lg:p-2 text-stone-500 dark:text-stone-200">
				:
			</div>
			<div className="pb-5 sm:pb-0 w-full flex items-center col-span-6">
				<input
					type="text"
					required
					value={authority}
					onChange={(e) => setAuthority(e.target.value)}
					minLength={32}
					maxLength={44}
					pattern={"^[A-HJ-NP-Za-km-z1-9]*$"}
					className="w-full sm:w-[21rem] md:w-[22rem] lg:w-[28rem] text-black text-xs lg:text-base px-1 bg-white dark:bg-stone-200 focus-within:ring-2 hover:ring-violet-700 focus-within:ring-violet-700 dark:hover:ring-solana-purple dark:focus-within:ring-solana-purple rounded-sm ring-2 ring-stone-500 dark:ring-stone-400 shadow-sm focus:outline-none caret-violet-700 dark:caret-solana-purple appearance-none invalid:ring-rose-700"
				/>
			</div>
		</div>
	);
};

export default AuthorityRow;
