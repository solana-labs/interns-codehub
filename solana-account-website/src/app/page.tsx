"use client";

import { useRouter } from "next/navigation";
import { DataTypeOption } from "solana-data-program";

export default function Home() {
	const dataTypeDescription = new Map<DataTypeOption, string>();
	dataTypeDescription.set(
		DataTypeOption.CUSTOM,
		"A default datatype to store custom data"
	);
	dataTypeDescription.set(
		DataTypeOption.JSON,
		"Datatype to store JSON data that will be parsed and pretty-printed"
	);
	dataTypeDescription.set(DataTypeOption.IMG, "Datatype to store image data");
	dataTypeDescription.set(
		DataTypeOption.HTML,
		"Datatype to store HTML data that will be output in an iframe"
	);

	const router = useRouter();
	return (
		<>
			<section>
				<h1 className="text-sm sm:text-base lg:text-lg">
					Enter the{" "}
					<code className="text-violet-700 dark:text-solana-purple">
						PublicKey
					</code>{" "}
					of the Data Account you wish to inspect above...
				</h1>
				<br />
				<p className="text-sm sm:text-base lg:text-lg pb-2">
					Currently the supported data types are:
				</p>
				<table className="table-auto">
					<tbody>
						{Object.keys(DataTypeOption)
							.filter((key) => isNaN(Number(key)))
							.map((dataType, idx) => {
								return (
									<tr key={idx}>
										<th
											scope="row"
											className="text-xs sm:text-sm lg:text-base text-left text-violet-700 dark:text-solana-purple"
										>
											{dataType}
										</th>
										<td className="text-stone-500 dark:text-stone-200 px-2">
											:
										</td>
										<td className="text-xs sm:text-sm lg:text-base text-stone-500 dark:text-stone-200">
											{dataTypeDescription.get(idx)}
										</td>
									</tr>
								);
							})}
					</tbody>
				</table>
			</section>
			<section className="flex flex-col mt-3 sm:mt-8 justify-center">
				<p className="text-sm sm:text-base lg:text-lg pt-3 pb-5">
					You can also make use of the Data Program and upload your custom data
					to the Solana blockchain. Click the button below to get started! 🎉
				</p>
				<button
					className="w-full sm:w-fit m-auto rounded-md bg-emerald-500 dark:bg-solana-green/80 hover:bg-emerald-700 dark:hover:bg-emerald-600 focus:bg-emerald-700 dark:focus:bg-emerald-600 text-white text-sm sm:text-base lg:text-lg font-semibold py-2 px-4 border-b-4 border-emerald-700 dark:border-emerald-600 hover:border-emerald-500 dark:hover:border-solana-green/80 focus:border-emerald-500 dark:focus:border-solana-green/80 disabled:bg-emerald-500 dark:disabled:bg-emerald-600 disabled:hover:border-emerald-500 dark:disabled:hover:border-emerald-600 disabled:focus:border-emerald-500 dark:disabled:focus:border-emerald-600 outline-none"
					onClick={() => router.push(`/upload`)}
				>
					Get Started!
				</button>
			</section>
			<h1 className="mt-5 sm:mt-10 text-sm sm:text-base lg:text-lg">
				Alternatively, if you have used the Data Program previously to create
				Data Account(s), enter the following:
				<br />
				<button
					title="click to copy"
					onClick={() => navigator.clipboard.writeText("authority/")}
					className="px-2 rounded-md bg-white dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-900 focus:bg-stone-200 dark:focus:bg-stone-900 appearance-none outline-none focus:ring-2 ring-violet-700 dark:ring-solana-purple"
				>
					<code className="text-xs xs:text-sm sm:text-base lg:text-lg text-violet-700 dark:text-solana-purple">
						{`authority/<Authority PublicKey>`}
					</code>
				</button>
				<br />
				in the search bar to view all the Data Accounts that belongs to that{" "}
				<code>PublicKey</code>
			</h1>
		</>
	);
}
