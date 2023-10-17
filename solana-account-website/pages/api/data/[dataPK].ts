import { ApiError, ClusterNames } from "@/app/utils/types";
import { getMimeType, isBase58 } from "@/app/utils/utils";
import { Connection, PublicKey } from "@solana/web3.js";
import type { NextApiRequest, NextApiResponse } from "next";
import { DataProgram } from "solana-data-program";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Buffer | ApiError>
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

	const { dataPK, cluster, ext } = req.query;
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
		const account_data = await DataProgram.parseData(
			new Connection(clusterURL),
			new PublicKey(dataPK),
			"confirmed"
		);
		if (!account_data) {
			res
				.status(400)
				.json({ error: "No data corresponding to the Data Account" });
			return;
		}
		if (ext) {
			res.status(200).setHeader("Content-type", ext).send(account_data);
		} else {
			const base64 = account_data.toString("base64");
			const type = getMimeType(base64);
			res.status(200).setHeader("Content-type", type).send(account_data);
		}
	} catch (err) {
		if (err instanceof Error) {
			res.status(400).json({ error: err.message });
		}
	}
}
