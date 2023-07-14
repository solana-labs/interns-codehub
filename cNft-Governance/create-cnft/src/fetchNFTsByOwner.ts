import { loadPublicKeysFromFile } from "@/utils/helper";
import {
  Metaplex,
  MetaplexError,
  ReadApiAssetList,
  ReadApiConnection,
} from "@metaplex-foundation/js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { getAssetsByOwner, getAsset, getAssetProof } from "@/utils/read-api";

import dotenv from "dotenv";
dotenv.config();

(async () => {
  const client = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY ?? "[]"))
  );
  console.log("client: ", client.publicKey.toBase58());

  const RPC_URL = process.env.RPC_URL ?? clusterApiUrl("devnet");
  console.log("RPC_URL: ", RPC_URL);
  if (!RPC_URL) {
    return console.warn("Please set RPC_URL from Helius");
  }
  const connection = new Connection(RPC_URL, "confirmed");
  const balance = await connection.getBalance(client.publicKey);
  console.log("balance: ", balance);

  let keys = loadPublicKeysFromFile();
  if (!keys?.collectionMint || !keys?.treeAddress) {
    return console.warn("Please create collection and tree first");
  }

  const treeAddress = keys.treeAddress;
  const collectionMint = keys.collectionMint;
  console.log("==== Local PublicKeys loaded ====");
  console.log("Tree address:", treeAddress.toBase58());
  console.log("Collection mint:", collectionMint.toBase58());

  await getAssetsByOwner(connection, {
    ownerAddress: client.publicKey.toBase58(),
  }).then((res) => {
    console.log("Total assets returned: ", res.total);

    res.items
      // ?.filter((asset) => asset.compression.tree === treeAddress.toBase58())
      ?.filter(
        (asset) =>
          asset.compression.compressed &&
          asset.content.json_uri ===
            "https://supersweetcollection.notarealurl/token.json"
      )
      ?.map((asset) => {
        // display some info about the asset
        console.log("assetId:", asset.id);
        console.log("treeAddress", asset.compression.tree);
        console.log("====================");
        // console.log("ownership:", asset.ownership);
        // console.log("compression:", asset.compression);
        // console.log("collection:", asset.grouping[0].group_value);
        // console.log(asset);
        getAssetProof(connection, new PublicKey(asset.id)).then((res) => {
          console.log(res);
        });
      });
  });

  // await getAsset(
  //   connection,
  //   new PublicKey("4bCPfvu7JWGcFpZzpD6QAkYA5GNXsN7dpvqyFrYhGtzC")
  // ).then((res) => {
  //   console.log(res);
  // });

  // await getAssetProof(
  //   connection,
  //   new PublicKey("4bCPfvu7JWGcFpZzpD6QAkYA5GNXsN7dpvqyFrYhGtzC")
  // ).then((res) => {
  //   console.log(res);
  // });
})();

// (async () => {
//   // load the stored PublicKeys for ease of use
//   let keys = loadPublicKeysFromFile();

//   // ensure the primary script was already run
//   if (!keys?.collectionMint || !keys?.treeAddress)
//     return console.warn(
//       "No local keys were found. Please run the `index` script"
//     );

//   const treeAddress: PublicKey = keys.treeAddress;
//   const treeAuthority: PublicKey = keys.treeAuthority;
//   const collectionMint: PublicKey = keys.collectionMint;
//   const userAddress: PublicKey = keys.userAddress;

//   console.log("==== Local PublicKeys loaded ====");
//   console.log("Tree address:", treeAddress.toBase58());
//   console.log("Tree authority:", treeAuthority.toBase58());
//   console.log("Collection mint:", collectionMint.toBase58());
//   console.log("User address:", userAddress.toBase58());

//   // define the address we are actually going to check (in this case, either are user's address or test address)
//   // const checkAddress = testWallet.toBase58();
//   const checkAddress = userAddress.toBase58();

//   const CLUSTER_URL = process.env.RPC_URL ?? "";
//   const connection = new ReadApiConnection(CLUSTER_URL);
//   const metaplex = Metaplex.make(connection);

//   /**
//    * Fetch a listing of NFT assets by an owner's address (via the ReadApi)
//    * ---
//    * NOTE: This will return both compressed NFTs AND traditional/uncompressed NFTS
//    */
//   const rpcAssets = await metaplex
//     .rpc()
//     .getAssetsByOwner({
//       ownerAddress: checkAddress,
//     })
//     .then((res) => {
//       if ((res as MetaplexError)?.cause) throw res;
//       else return res as ReadApiAssetList;
//     });

//   /**
//    * Process the returned `rpcAssets` response
//    */
//   console.log("Total assets returned:", rpcAssets.total);

//   // loop over each of the asset items in the collection
//   rpcAssets.items.map((asset) => {
//     // only show compressed nft assets
//     if (!asset.compression.compressed) return;

//     // display a spacer between each of the assets
//     console.log("\n===============================================");

//     // locally save the addresses for the demo
//     // savePublicKeyToFile("assetIdTestAddress", new PublicKey(asset.id));

//     // extra useful info
//     console.log("assetId:", asset.id);

//     // view the ownership info for the given asset
//     console.log("ownership:", asset.ownership);

//     // metadata json data (auto fetched thanks to the Metaplex Read API)
//     // console.log("metadata:", asset.content.metadata);

//     // view the compression specific data for the given asset
//     console.log("compression:", asset.compression);

//     if (asset.compression.compressed) {
//       console.log("==> This NFT is compressed! <===");
//       console.log("\tleaf_id:", asset.compression.leaf_id);
//     } else console.log("==> NFT is NOT compressed! <===");
//   });
// })();
