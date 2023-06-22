# cNFT Gonvernance

Reference(fork): [nft-voter](https://github.com/solana-labs/governance-program-library/tree/master/programs/nft-voter)

### Function to be modify
1. ./cnft-voter/src/state/registrar.rs - resolve_nft_vote_weight_and_mint
2. ./cnft-voter/src/instructions/update_voter_weight_record.rs - update_voter_weight_record



### Thoughts
1. Can we also store votes as a merkle tree?