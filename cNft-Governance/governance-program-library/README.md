# Governance Program Library
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

### Reference:

1. [nft-voter](https://github.com/solana-labs/governance-program-library/tree/master/programs/nft-voter)
2. [governance-ui](https://github.com/solana-labs/governance-ui)
