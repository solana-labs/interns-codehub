# cNFT Gonvernance

Reference(fork): [nft-voter](https://github.com/solana-labs/governance-program-library/tree/master/programs/nft-voter)

### Function to be modify
1. ./cnft-voter/src/state/registrar.rs - resolve_nft_vote_weight_and_mint
2. ./cnft-voter/src/instructions/update_voter_weight_record.rs - update_voter_weight_record
3. ./cnft-voter/src/instructions/relinquish_nft_vote.rs - relinquish_nft_vote
4. ./cnft-voter/src/state/nft_vote_record.rs
5. ./cnft-voter/src/instructions/configure_collection.rs - configure_collection
6. ./cnft-voter/src/instructions/cast-nft-voter.rs - cast-nft-voter




### Thoughts
1. Can we also store votes as a merkle tree?