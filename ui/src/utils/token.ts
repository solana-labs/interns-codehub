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
  createMintToInstruction,
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
import BN from 'bn.js'

export type ResolvedTokenAddressInstruction = {
  address: PublicKey;
} & Instruction

export async function createAndMintToManyATAs(
  provider: AnchorProvider,
  mints: Mint[],
  amount: number | BN,
  funder?: web3.PublicKey
): Promise<web3.PublicKey[]> {
  return Promise.all(
    mints.map((mint) =>
      createAndMintToAssociatedTokenAccount(
        provider,
        mint,
        amount,
        funder,
        funder
      )
    )
  )
}

/**
 * Get or Create an associated token account for the specified token mint and owner.
 * Then, mint the specified amount of token into the created or retrieved associated token account.
 *
 * @param provider
 * @param mint
 * @param amount Amount to mint without decimals multipled. For example, 100 to mint 100 SOL.
 * @param destinationWallet Receiver of the tokens. Defaults to the provider's wallet.
 * @param payer Pays for transactions and rent. Defaults to the provider's wallet.
 * @returns
 */
export async function createAndMintToAssociatedTokenAccount(
  provider: AnchorProvider,
  mint: Mint,
  amount: number | BN,
  destinationWallet?: web3.PublicKey,
  payer?: web3.PublicKey
): Promise<web3.PublicKey> {
  const destinationWalletKey = destinationWallet
    ? destinationWallet
    : provider.wallet.publicKey
  const payerKey = payer ? payer : provider.wallet.publicKey
  const amountWithDecimals = new BN(amount).mul(new BN(10 ** mint.decimals))

  if (TokenUtil.isNativeMint(mint.address)) throw new Error('No native token')

  const tokenAccounts = await provider.connection.getParsedTokenAccountsByOwner(
    destinationWalletKey,
    {
      programId: TOKEN_PROGRAM_ID,
    }
  )

  let tokenAccount = tokenAccounts.value
    .map((account) => {
      if (account.account.data.parsed.info.mint === mint.address.toString()) {
        return account.pubkey
      }
    })
    .filter(Boolean)[0]

  if (!tokenAccount) {
    tokenAccount = await createAssociatedTokenAccount(
      provider,
      mint.address,
      destinationWalletKey,
      payerKey
    )
  }

  await mintToDestination(
    provider,
    mint.address,
    tokenAccount!,
    amountWithDecimals
  )
  return tokenAccount!
}

export async function createAssociatedTokenAccount(
  provider: AnchorProvider,
  mint: web3.PublicKey,
  owner: web3.PublicKey,
  payer: web3.PublicKey,
  allowOwnerOffCurve: boolean = true
) {
  const ataAddress = getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve)
  const instr = createAssociatedTokenAccountInstruction(
    payer,
    ataAddress,
    owner,
    mint
  )
  const tx = new web3.Transaction()
  tx.add(instr)
  await provider.sendAndConfirm(tx, [], { commitment: 'confirmed' })
  return ataAddress
}

/**
 * Mints tokens to the specified destination token account.
 * @param provider An anchor AnchorProvider object used to send transactions
 * @param mint Mint address of the token
 * @param destination Destination token account to receive tokens
 * @param amount Number of tokens to mint
 */
export async function mintToDestination(
  provider: AnchorProvider,
  mint: web3.PublicKey,
  destination: web3.PublicKey,
  amount: number | BN
): Promise<string> {
  const tx = new web3.Transaction()
  const amountVal = amount instanceof BN ? BigInt(amount.toString()) : amount
  tx.add(
    createMintToInstruction(
      mint,
      destination,
      provider.wallet.publicKey,
      amountVal
    )
  )
  return provider.sendAndConfirm(tx, [], { commitment: 'confirmed' })
}


export async function getTokenBalance(
  provider: AnchorProvider,
  vault: web3.PublicKey
) {
  return (await provider.connection.getTokenAccountBalance(vault, 'confirmed'))
    .value.amount
}