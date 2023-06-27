import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { CompressedNftVoter } from "../target/types/cnft_voter";

describe("cnft-voter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.CompressedNftVoter as Program<CompressedNftVoter>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
