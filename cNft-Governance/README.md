# cNFT Gonvernance

Reference(fork): [nft-voter](https://github.com/solana-labs/governance-program-library/tree/master/programs/nft-voter)

### create-cnft

This code base contain basic:

- Create merkle tree and collection
- Mint a cNFT
- Fetch cNFT's info (ReadApi) from endpointRPC

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
