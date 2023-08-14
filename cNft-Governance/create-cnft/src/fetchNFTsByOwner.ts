import { loadPublicKeysFromFile } from "@/utils/helper";
import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { getAssetsByOwner, getAsset, getAssetProof } from "@/utils/read-api";

import dotenv from "dotenv";
import { Metaplex } from "@metaplex-foundation/js";
dotenv.config();

(async () => {
  const RPC_URL = process.env.RPC_URL ?? clusterApiUrl("devnet");
  if (!RPC_URL) {
    return console.warn("Please set RPC_URL from Helius");
  }
  const connection = new Connection(RPC_URL, "confirmed");

  let keys = loadPublicKeysFromFile();
  if (!keys?.collectionMint) {
    return console.warn("Please create collection and tree first");
  }

  const collectionMint = keys.collectionMint;
  console.log("Collection Address:", collectionMint.toBase58());

  const owner = "J54szN8Y7H8QT7v6amC351S75Qu3xgU5puoiXgW6ke3L"; // replace to your owner address
  const rawAssets = await getAssetsByOwner(connection, {
    ownerAddress: owner,
  });
  const assets = rawAssets.items?.filter((asset) => {
    return (
      asset.compression &&
      asset.grouping.length > 0 &&
      asset.grouping.find(
        (group) => group.group_value === collectionMint.toBase58()
      )
    );
  });
  console.log(assets);
  // const nfts = assets.filter((asset) => !asset.compression.compressed);
  // const cnfts = assets.filter((asset) => asset.compression.compressed);

  // nfts.map((nft) => {
  //   console.log("NFT Address: ", nft.id);
  // });
  // cnfts.map((cnft) => {
  //   console.log("cNFT Asset ID: ", cnft.id);
  // });

  // const metaplex = new Metaplex(connection);
  // const metadata = await metaplex
  //   .nfts()
  //   .findByMint({
  //     mintAddress: new PublicKey(
  //       "696GmVXNapR99oqM1LroRFxrq25FLHZoKQeCvff1CAc3"
  //     ),
  //   });

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
