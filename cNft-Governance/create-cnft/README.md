### Create NFT and Compressed NFT (cNFT) collections

This directory designed to facilitate the creation of Non-Fungible Token (NFT) collections, as well as the generation of tree accounts for NFT and Compressed NFT (cNFT) minting.

By default, this main.ts initiates the creation of a unique NFT collection, alongside two tree accounts. The respective depths of these tree accounts are set to 5 and 14, where the proof length will be 3 and 10 respectively based on the canopy depth. This script will also mint 2 NFTs and 3 cNFTs.(Checkout your wallet that support compressed NFT).

In order to fetch NFT information, it is advised to utilize an RPC that supports both the ReadApi and the Digital Assets Standard (DAS), ex: Helius RPC.

1. setup
   create a .env file (rename .env.sample) in the root directory and add the following variables
   - EXTENSION: your nft images extension
   - RPC_URL: add rpc that support ReadApi (e.g. https://rpc-devnet.helius.xyz/?api-key=<api_key>)
   - PRIVATE_KEY: your private key (should be array)
2. create collection.json
3. create .local_key directory in the root and add keys.json file.
4. config your own steps in main.ts

```cmd
# install dependencies
yarn install

# run
yarn demo ./src/main.ts

# fetch nfts
yarn demo ./src/fetchNftsByOwner.ts
```
