import { AnchorProvider, web3 } from '@coral-xyz/anchor'
import { Instruction, TokenUtil, TransactionBuilder } from '@orca-so/common-sdk'
import {
  AccountLayout,
  Mint,
	NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
	createCloseAccountInstruction,
  createInitializeAccount3Instruction,
	createInitializeAccountInstruction,
  createInitializeMintInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
	SystemProgram,
} from '@solana/web3.js'

export type ResolvedTokenAddressInstruction = {
  address: PublicKey;
} & Instruction

// export async function createMint(
//   provider: AnchorProvider,
//   authority?: web3.PublicKey
// ): Promise<web3.PublicKey> {
//   if (authority === undefined) {
//     authority = provider.wallet.publicKey
//   }
//   const mint = web3.Keypair.generate()
//   const instructions = await createMintInstructions(
//     provider,
//     authority,
//     mint.publicKey
//   )

//   const tx = new web3.Transaction()
//   tx.add(...instructions)

//   await provider.sendAndConfirm(tx, [mint], { commitment: 'confirmed' })

//   return mint.publicKey
// }

// export async function createMintInstructions(
//   provider: AnchorProvider,
//   authority: web3.PublicKey,
//   mint: web3.PublicKey
// ) {
//   let instructions = [
//     web3.SystemProgram.createAccount({
//       fromPubkey: provider.wallet.publicKey,
//       newAccountPubkey: mint,
//       space: 82,
//       lamports: await provider.connection.getMinimumBalanceForRentExemption(82),
//       programId: TOKEN_PROGRAM_ID,
//     }),
//     createInitializeMintInstruction(mint, 0, authority, null),
//   ]
//   return instructions
// }

// export async function createTokenAccount(
//   provider: AnchorProvider,
//   mint: web3.PublicKey,
//   owner: web3.PublicKey
// ) {
//   const tokenAccount = web3.Keypair.generate()
//   const tx = new web3.Transaction()
//   tx.add(
//     ...(await createTokenAccountInstrs(
//       provider,
//       tokenAccount.publicKey,
//       mint,
//       owner
//     ))
//   )
//   await provider.sendAndConfirm(tx, [tokenAccount], { commitment: 'confirmed' })
//   return tokenAccount.publicKey
// }

// export async function createAssociatedTokenAccount(
//   provider: AnchorProvider,
//   mint: web3.PublicKey,
//   owner: web3.PublicKey,
//   payer: web3.PublicKey,
//   allowOwnerOffCurve: boolean = true
// ) {
//   const ataAddress = getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve)
//   const instr = createAssociatedTokenAccountInstruction(
//     payer,
//     ataAddress,
//     owner,
//     mint
//   )
//   const tx = new web3.Transaction()
//   tx.add(instr)
//   await provider.sendAndConfirm(tx, [], { commitment: 'confirmed' })
//   return ataAddress
// }

// async function createTokenAccountInstrs(
//   provider: AnchorProvider,
//   newAccountPubkey: web3.PublicKey,
//   mint: web3.PublicKey,
//   owner: web3.PublicKey,
//   lamports?: number
// ) {
//   if (lamports === undefined) {
//     lamports = await provider.connection.getMinimumBalanceForRentExemption(165)
//   }
//   return [
//     web3.SystemProgram.createAccount({
//       fromPubkey: provider.wallet.publicKey,
//       newAccountPubkey,
//       space: 165,
//       lamports,
//       programId: TOKEN_PROGRAM_ID,
//     }),
//     createInitializeAccount3Instruction(newAccountPubkey, mint, owner),
//   ]
// }

// /**
//  * Get an associated token account for the specified token mint and owner.
//  * Also works for native mint, ie. wSOL.
//  *
//  * @param provider
//  * @param mint
//  * @param destinationWallet Receiver of the tokens. Defaults to the provider's wallet.
//  * @param payer Pays for transactions and rent. Defaults to the provider's wallet.
//  * @returns
//  */
// export async function getAssociatedTokenAccount(
//   provider: AnchorProvider,
//   mint: Mint,
//   destinationWallet?: web3.PublicKey,
//   payer?: web3.PublicKey
// ): Promise<web3.PublicKey> {
//   const destinationWalletKey = destinationWallet
//     ? destinationWallet
//     : provider.wallet.publicKey
//   const payerKey = payer ? payer : provider.wallet.publicKey

// 	const payerKey = payer ?? owner;
// 	const unwrapDestinationKey = unwrapDestination ?? payer ?? owner;

//   // Workaround For SOL - just create a wSOL account to satisfy the rest of the test building pipeline.
//   // Tests who want to test with SOL will have to request their own airdrop.
//   if (TokenUtil.isNativeMint(mint.address)) {
//     // mint.address === NATIVE_MINT
//     const rentExemption =
//       await provider.connection.getMinimumBalanceForRentExemption(
//         AccountLayout.span,
//         'confirmed'
//       )
//     const txBuilder = new TransactionBuilder(
//       provider.connection,
//       provider.wallet
//     )
//     const { address: tokenAccount, ...ix } =
// 			createWrappedNativeAccountInstructionWithKeypair(
//         destinationWalletKey,
//         rentExemption,
// 				payerKey,
// 				unwrapDestinationKey
//       )
//     txBuilder.addInstruction({ ...ix, cleanupInstructions: [] })

//     try {
//       await txBuilder.buildAndExecute()
//     } catch (err) {
//       // ignore error as the error is likely that the account already exists
//     }

//     return tokenAccount
//   }

//   const tokenAccounts = await provider.connection.getParsedTokenAccountsByOwner(
//     destinationWalletKey,
//     {
//       programId: TOKEN_PROGRAM_ID,
//     }
//   )

//   let tokenAccount = tokenAccounts.value
//     .map((account) => {
//       if (account.account.data.parsed.info.mint === mint.address.toString()) {
//         return account.pubkey
//       }
//     })
//     .filter(Boolean)[0]

//   if (!tokenAccount) {
//     tokenAccount = await createAssociatedTokenAccount(
//       provider,
//       mint.address,
//       destinationWalletKey,
//       payerKey
//     )
//   }

//   return tokenAccount!
// }

// // https://github.com/orca-so/orca-sdks/blob/main/packages/common-sdk/src/web3/token-util.ts#L132
// function createWrappedNativeAccountInstructionWithKeypair(
//   owner: PublicKey,
//   rentExemptLamports: number,
//   payerKey: PublicKey,
//   unwrapDestinationKey: PublicKey,
// ): ResolvedTokenAddressInstruction {
//   const tempAccount = new Keypair()

//   const createAccountInstruction = SystemProgram.createAccount({
//     fromPubkey: payerKey,
//     newAccountPubkey: tempAccount.publicKey,
//     lamports: rentExemptLamports,
//     space: AccountLayout.span,
//     programId: TOKEN_PROGRAM_ID,
//   })

//   const initAccountInstruction = createInitializeAccountInstruction(
//     tempAccount.publicKey,
//     NATIVE_MINT,
//     owner
//   )

//   const closeWSOLAccountInstruction = createCloseAccountInstruction(
//     tempAccount.publicKey,
//     unwrapDestinationKey,
//     owner
//   )

//   return {
//     address: tempAccount.publicKey,
//     instructions: [createAccountInstruction, initAccountInstruction],
//     cleanupInstructions: [closeWSOLAccountInstruction],
//     signers: [tempAccount],
//   }
// }

export async function getTokenBalance(
  provider: AnchorProvider,
  vault: web3.PublicKey
) {
  return (await provider.connection.getTokenAccountBalance(vault, 'confirmed'))
    .value.amount
}