# cNFT Gonvernance
Reference(fork): [nft-voter](https://github.com/solana-labs/governance-program-library/tree/master/programs/nft-voter)

### Question
1. how to get cNFT' collenction.verifird from ReadAPI?
2. why cast_nft_vote's payer is not the nft_owner but the bench.payer?
3. how to deal with nft in different tree
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

### Governance UI
1. connect to wallet
2. Helius RPI search for cNFT's asset_id and metadata
3. Helius RPI search for cNFT's proof

Input:
1. collection_mint
2. asset_id
3. owner
4. metadata_args
5. leaf_owner: Signer
6. leaf_delegate: AccountInfo<'info>
7. merkle_tree: UncheckedAccount<'info>
8. tree_root

### Function to be modify
1. [o]./cnft-voter/src/state/registrar.rs - resolve_nft_vote_weight_and_mint
    - we need nft_owner, nft_owner == governing_token_owner
    - nft_mint_address not in unique_nft_mint, maybe change it to asset_id
    - check nft belongs to collection and is verified
    - get nft_metadata, but check owner before getting it. Does cNFT have owner? prob not
    - use "create_and_serialize_account_signed" to create vote for that nft
2. ./cnft-voter/src/instructions/update_voter_weight_record.rs - update_voter_weight_record
3. ./cnft-voter/src/instructions/relinquish_nft_vote.rs - relinquish_nft_vote
4. [v]./cnft-voter/src/state/nft_vote_record.rs -> cnft_vote_record
5. [o]./cnft-voter/src/instructions/cast-nft-voter.rs - cast-nft-voter
    - reference governance_ui/utils/uiTypes/VotePlugin.ts (line 472)
    - the "resolve_nft_weight_and_mint" function will also be involved
    - remaining_accounts: nfts mint
    - 1 nft 3 account: nft_info, nft_metadata_info, vote_record_info
    - verify and get info from "resolve_nft_weight_and_mint" function
    - use "create_and_serialize_account_signed" to create vote for that nft

### Types
1. TokenOwnerRecord(vote_token_owner_record): oyster/packages/governance-sdk/src/governance/accounts/ts (line569)

### Thoughts
1. Can we also store votes as a merkle tree?
2. How to verify nft owner address
3. How to verify nft amount == 1

### Tests
1. Mint Compressed NFT (to be refactored)
    - token_metadata_test.rs
    - merkle_tree_test.rs
    - mint_compressed_nft.rs
    - get cnft proofs
2. Cast cNFT vote
    - cast one cnft vote
    - cast vote with multiple cnft
    - test with different canopy!!