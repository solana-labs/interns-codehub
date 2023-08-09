# Governance Program Library
This project incorporates the cnft-voter plugin, designed specifically for governance tasks. The cnft-voter distinguishes itself from the standard nft-voter in terms of its verification mechanism for the ownership and legitimacy of the compressed Non-Fungible Tokens (cNFTs) within the registrar's collections.

Unlike standard NFTs, where metadata can be obtained directly from program accounts, cNFTs necessitate a slightly different approach for metadata collection. In this case, it is requisite to use an RPC that supports the ReadAPI to fetch the cNFT metadata.

Following the retrieval of the metadata, of type MetadataArgs, this data is reproduced and then dispatched to the on-chain program. Accompanied by the merkle proofs, this process serves to validate the metadata.
The cnft-voter plugin thus ensures a robust and efficient mechanism for cNFT verification, optimizing the governance process within this project.

There are two programs in this project:
1. ~/programs/nft-voter: This is a fork of nft-voter that support both NFT and cNFT voting.
2. ~/programs/parallel-tree: This is a project that support minting a parallel tree that can store additional data of cNFT, such as governing voting weight.(required to talk with Helius team for customized DAS API)

**CLI version**

1. cargo(rustc): 1.65.0
2. anchor: 0.27.0
3. solana-cli: 1.14.18

**Instructions**

```cmd
# build
cd /programs/{program}
cargo build-sbf

# test
cd /programs/{program}
cargo test-sbf

# generate idl (json, ts)
anchor build --arch sbf

# deploy contract
cargo program deploy <program file path> --program-id <keypair of program id file path>
```

### Reference:

1. [nft-voter](https://github.com/solana-labs/governance-program-library/tree/master/programs/nft-voter)
2. [governance-ui](https://github.com/solana-labs/governance-ui)
