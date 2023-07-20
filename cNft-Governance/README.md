# cNFT Gonvernance

Reference(fork): [nft-voter](https://github.com/solana-labs/governance-program-library/tree/master/programs/nft-voter)

### create-cnft setup

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

### cnft-voter

This project incorporates the cnft-voter plugin, designed specifically for governance tasks. The cnft-voter distinguishes itself from the standard nft-voter in terms of its verification mechanism for the ownership and legitimacy of the compressed Non-Fungible Tokens (cNFTs) within the registrar's collections.

Unlike standard NFTs, where metadata can be obtained directly from program accounts, cNFTs necessitate a slightly different approach for metadata collection. In this case, it is requisite to use an RPC that supports the ReadAPI to fetch the cNFT metadata.

Following the retrieval of the metadata, of type MetadataArgs, this data is reproduced and then dispatched to the on-chain program. Accompanied by the merkle proofs, this process serves to validate the metadata.
The cnft-voter plugin thus ensures a robust and efficient mechanism for cNFT verification, optimizing the governance process within this project.

There are two programs in this project:

1. ~/programs/cnft-voter: This is a seperate program that only support cNFT voting.
2. ~/programs/nft-voter: This is a fork of nft-voter that support both NFT and cNFT voting.

**CLI version**

1. cargo(rustc): 1.65.0
2. anchor: 0.27.0
3. solana-cli: 1.14.18

**Instructions**

```cmd
# build
cd /programs/{program}
cargo build-sbf

# generate idl
anchor build --arch sbf

# test
cd /programs/{program}
cargo test-sbf
```

### File to explore in this project

1. ./instructions/cast_cnft_vote.rs
2. ./instructions/update_voter_weight_record.rs
3. ./instructions/verify_compressed_nft.rs
4. ./state/cnft_verification.rs
5. ./state/registrar.rs
