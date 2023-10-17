import { ApiError, ClusterNames } from "@/app/utils/types";
import { isBase58 } from "@/app/utils/utils";
import { Connection, PublicKey } from "@solana/web3.js";
import type { NextApiRequest, NextApiResponse } from "next";
import { DataProgram, IDataAccountMeta } from "solana-data-program";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<IDataAccountMeta | ApiError>
) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader(
		"Access-Control-Allow-Methods",
		"GET, PUT, POST, DELETE, HEAD, OPTIONS"
	);

	if (req.method !== "GET") {
		res.status(405).json({ error: "Unsupported method" });
		return;
	}

	const { dataPK, cluster } = req.query;
	const clusterURL = Object.values(ClusterNames).find(
		({ name }) => name.toLowerCase() === cluster?.toString().toLowerCase()
	)?.url;
	if (!clusterURL) {
		res.status(400).json({ error: "Invalid Cluster" });
		return;
	}

	if (!dataPK || !isBase58(dataPK as string)) {
		res.status(400).json({ error: "Invalid Data Account PublicKey" });
		return;
	}

	try {
		const account_meta = await DataProgram.parseMetadata(
			new Connection(clusterURL),
			new PublicKey(dataPK),
			"confirmed"
		);
		if (!account_meta) {
			res
				.status(400)
				.json({ error: "No metadata corresponding to the Data Account" });
			return;
		}
		res.status(200).send(account_meta);
	} catch (err) {
		if (err instanceof Error) {
			res.status(400).json({ error: err.message });
		}
	}
}
