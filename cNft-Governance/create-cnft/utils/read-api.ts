// https://github.com/metaplex-foundation/compression-read-api-js-examples/blob/master/wrappedConnection.ts
import {
    GetAssetProofRpcInput,
    GetAssetProofRpcResponse,
    GetAssetsByGroupRpcInput,
    GetAssetsByOwnerRpcInput,
    MetaplexError,
    ReadApiAssetList,
} from "@metaplex-foundation/js";
import { Connection, PublicKey } from "@solana/web3.js";

type JsonRpcParams<ReadApiMethodParams> = {
    method: string;
    id?: string;
    params: ReadApiMethodParams;
};

type JsonRpcOutput<ReadApiJsonOutput> = {
    result: ReadApiJsonOutput;
};

/** @group Errors */
export class ReadApiError extends MetaplexError {
    readonly name: string = "ReadApiError";
    constructor(message: string, cause?: Error) {
        super(message, "rpc", undefined, cause);
    }
}

const callReadApi = async <ReadApiMethodParams, ReadApiJsonOutput>(
    connection: Connection,
    jsonRpcParams: JsonRpcParams<ReadApiMethodParams>
): Promise<JsonRpcOutput<ReadApiJsonOutput>> => {
    const response = await fetch(connection.rpcEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            method: jsonRpcParams.method,
            id: jsonRpcParams.id ?? "rpd-op-123",
            params: jsonRpcParams.params,
        }),
    });

    return await response.json();
};

export async function getAssetProof(
    connection: Connection,
    assetId: PublicKey
): Promise<GetAssetProofRpcResponse> {
    const { result: proof } = await callReadApi<GetAssetProofRpcInput, GetAssetProofRpcResponse>(
        connection,
        {
            method: "getAssetProof",
            params: {
                id: assetId.toBase58(),
            },
        }
    );
    if (!proof) throw new ReadApiError("No asset proof returned");

    return proof;
}

export async function getAssetsByGroup(
    connection: Connection,
    { groupKey, groupValue, page, limit, sortBy, before, after }: GetAssetsByGroupRpcInput
): Promise<ReadApiAssetList> {
    // `page` cannot be supplied with `before` or `after`
    if (typeof page == "number" && (before || after))
        throw new ReadApiError(
            "Pagination Error. Only one pagination parameter supported per query."
        );

    // a pagination method MUST be selected, but we are defaulting to using `page=0`

    const { result } = await callReadApi<GetAssetsByGroupRpcInput, ReadApiAssetList>(connection, {
        method: "getAssetsByGroup",
        params: {
            groupKey,
            groupValue,
            after: after ?? null,
            before: before ?? null,
            limit: limit ?? null,
            page: page ?? 1,
            sortBy: sortBy ?? null,
        },
    });

    if (!result) throw new ReadApiError("No results returned");

    return result;
}

export async function getAssetsByOwner(
    connection: Connection,
    { ownerAddress, page, limit, sortBy, before, after }: GetAssetsByOwnerRpcInput
): Promise<ReadApiAssetList> {
    // `page` cannot be supplied with `before` or `after`
    if (typeof page == "number" && (before || after))
        throw new ReadApiError(
            "Pagination Error. Only one pagination parameter supported per query."
        );

    // a pagination method MUST be selected, but we are defaulting to using `page=0`

    const { result } = await callReadApi<GetAssetsByOwnerRpcInput, ReadApiAssetList>(connection, {
        method: "getAssetsByOwner",
        params: {
            ownerAddress,
            after: after ?? null,
            before: before ?? null,
            limit: limit ?? null,
            page: page ?? 1,
            sortBy: sortBy ?? null,
        },
    });

    if (!result) throw new ReadApiError("No results returned");

    return result;
}
