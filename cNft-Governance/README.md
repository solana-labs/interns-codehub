# cNFT Gonvernance

Reference(fork): [nft-voter](https://github.com/solana-labs/governance-program-library/tree/master/programs/nft-voter)

### create-cnft setup
This directory helps you create NFT collection and tree account and mint both NFT and compressed NFT.
The default will create a collection, two tree accounts, and mint 2 NFT and 3 cNFT.
1. setup
create a .env file (rename .env.sample) in the root directory and add the following variables
   - EXTENSION: your nft images extension
   - RPC_URL: add rpc that support ReadApi (e.g. https://rpc-devnet.helius.xyz/?api-key=<api_key>)
   - PRIVATE_KEY: your private key (should be array)
2. create collection.json
3. create .local_key directory in the root and add keys.json file.
4. config your own steps in main.ts
5. fetch your nfts
```cmd
# install dependencies
yarn install

# run
yarn demo ./src/main.ts

# fetch nfts
yarn demo ./src/fetchNftsByOwner.ts
```


### governance-program-library/programs/cnft-voter

This project include the cnft-voter plugin for governance.(To be merge into nft-voter after evaluation) The main difference of cnft-voter compare to nft-voter
is that how to verified cNFT belongs to the registrar collections and how the ownership of cNFT is valid. Unlike regular NFT able to collect NFT metadata from program accounts; instead, we require rpc that support ReadAPI to fetch cNFT metadata. Then reproduce the metadata, which type is MetadataArgs, and send it to on-chain program to verify it. Other functions and actions should be same as nft-voter.

**CLI version**

1. cargo(rustc): 1.65.0
2. anchor: 0.27.0
3. solana-cli: 1.14.18

**Instructions**

```cmd
# build
cd /programs/cnft-voter
cargo build-sbf
# or
anchor build --arch sbf

# create idl-ts
anchor build --arch sbf

# test
cd /programs/cnft-voter
cargo test-sbf
```

### File to explore in this project

1. ./instructions/cast_cnft_vote.rs
2. ./instructions/update_voter_weight_record.rs
3. ./state/cnft_vote_record.rs
4. ./state/registrar.rs

### Questiona

4. how to check nft amount

### Steps to create a goverance (from governance-ui)

1. Prepare realm configs: ./tools/governance/prepareRealmCreation.ts

   - program_id: create with new PublicKey()
   - community mint account
   - council mint account
   - realm authority: who create the gov
   - signer
   - return realm public key (a PDA where the seeds is based on the name of realm from program_id)

2. Create Registrar for nft

   - get registrar PDA address
   - need program_id, realm account pk, realm authority(the creater)

3. Configure collection
   - set max voter weight record's weight
   - configure the weight and size of collection
