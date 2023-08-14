# Parallel Tree for Solana 🌲

As the Solana ecosystem continues to evolve, compressed NFTs (cNFT) are gaining attentions, thanks to the `spl-account-compression`. The [Metaplex Bubblegum program](https://github.com/metaplex-foundation/mpl-bubblegum) has provided a framework for minting cNFTs for various applications. However, one limitation currently faced is the sole focus on storing NFT metadata without the capability to embed additional project-specific information. 

To address this, **Parallel Tree** has been developed as an innovative solution. It provides a parallel tree structure that mirrors the configuration of the main tree (created by Bubblegum). This allows for storing bespoke information at the leaf level, aligned with the original tree's indices.

🚧 **Blocker Note**:
At present, RPC solutions like Helius RPC and others supporting the Digital Assets Standard (DAS) API do not provide customized endpoints to fetch the data stored in the Parallel Tree. We hope to see advancements in this space soon to fully utilize the potential of this program.

## Features 🌟

1. **Parallel Configuration**:
   - Seamless creation of a parallel tree that mirrors the main Bubblegum tree.
   - Allows for harmonized and synchronized data storage with the original cNFTs.

2. **Flexible Leaf Data Storage**:
   - Store any type of project-specific information directly at the leaf level.
   - Ensures consistency by maintaining the same index as the main tree.

3. **DAO Governing Weight Integration**:
   - As of now, the only supported feature is the ability to add governing weights for DAOs to the leaf data.
   - Opens up possibilities for complex governance models using cNFTs.

4. **Expandable Architecture**:
   - While the current version is limited in scope, the architecture of Parallel Tree is designed for expandability.
   - Developers can look forward to more features being added as the project progresses.

Stay tuned for more updates as we continue to develop and refine Parallel Tree to serve the Solana community better.

