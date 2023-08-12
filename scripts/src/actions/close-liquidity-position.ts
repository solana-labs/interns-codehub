import * as anchor from '@coral-xyz/anchor'
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

import { getPostPoolInitParams } from '../params'
import { ParsableGlobalpool, ParsableLiquidityPosition } from '../types/parsing'
import { getAccountData } from '../utils'
import { createAndMintToManyATAs } from '../utils/token'
import { createTransactionChained } from '../utils/txix'
import { getTickArrayKeyFromTickIndex } from '../utils/tick-arrays'

async function main() {
  const argv = require('minimist')(process.argv.slice(2))
  if (!argv.k) {
    throw new Error('Public Key of the Position Mint must be supplied with -k flag')
  }

  const positionMintPubkey = new PublicKey(argv.k)

  const {
    provider,
    program,
    programId,
    connection,
    wallet,
    tickSpacing,
    globalpoolKey,
    tokenMintA,
    tokenMintB,
    cladKey,
  } = await getPostPoolInitParams()

  const mintAmount = new anchor.BN(0)
  const positionAuthority = wallet.publicKey

  const [authorityTokenAccountA, authorityTokenAccountB] =
    await createAndMintToManyATAs(
      provider,
      [tokenMintA, tokenMintB],
      mintAmount,
      positionAuthority
    )

  console.log(`Clad: ${cladKey.toBase58()}`)
  console.log(`Globalpool: ${globalpoolKey.toBase58()}`)

  const globalpoolInfo = await getAccountData(
    globalpoolKey,
    ParsableGlobalpool,
    connection
  )

  if (!globalpoolInfo) {
    throw new Error('Globalpool not found')
  }

  const { tokenVaultA, tokenVaultB } = globalpoolInfo
  console.log(`Token Vault A: ${tokenVaultA.toBase58()}`)
  console.log(`Token Vault B: ${tokenVaultB.toBase58()}`)

  //
  // Get position
  //

  const [positionKey] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('liquidity_position'),
      positionMintPubkey.toBuffer(),
    ],
    programId
  )

  const positionTokenAccount = getAssociatedTokenAddressSync(
    positionMintPubkey,
    positionAuthority
  )

  const position = await getAccountData(positionKey, ParsableLiquidityPosition, connection)
  if (!position) throw new Error('Invalid position account')

  const {
    tickLowerIndex,
    tickUpperIndex,
    liquidity: liquidityAmount,
  } = position

  console.log('position tick lower index: ', tickLowerIndex.toString())
  console.log('position tick upper index: ', tickUpperIndex.toString())
  console.log('position liquidity amount: ', liquidityAmount.toString())
  console.log(position)

  //
  // Clsoe Liquidity Position
  //

  const closeLiquidityPositionAccounts = {
    positionAuthority: positionAuthority,
    receiver: positionAuthority,

    position: positionKey,
    positionMint: positionMintPubkey,
    positionTokenAccount,

    // sys
    tokenProgram: TOKEN_PROGRAM_ID,
  }

  const decreaseLiquidityPositionParams = {
    liquidityAmount,
    tokenMinA: new BN(0),
    tokenMinB: new BN(0),
  }

  const tickArrayLowerKey = getTickArrayKeyFromTickIndex(
    globalpoolKey,
    tickLowerIndex,
    tickSpacing,
    programId
  )

  const tickArrayUpperKey = getTickArrayKeyFromTickIndex(
    globalpoolKey,
    tickUpperIndex,
    tickSpacing,
    programId
  )

  const decreaseLiquidityPositionAccounts = {
    positionAuthority,
    globalpool: globalpoolKey,
    position: positionKey,
    positionTokenAccount,
    tokenOwnerAccountA: authorityTokenAccountA,
    tokenOwnerAccountB: authorityTokenAccountB,
    tokenVaultA,
    tokenVaultB,
    tickArrayLower: tickArrayLowerKey,
    tickArrayUpper: tickArrayUpperKey,
    // sys
    tokenProgram: TOKEN_PROGRAM_ID,
  }

  const collectFeesAccounts = decreaseLiquidityPositionAccounts

  await createTransactionChained(
    provider.connection,
    provider.wallet,
    [
      program.instruction.collectFees({
        accounts: collectFeesAccounts,
      }),
      program.instruction.decreaseLiquidity(decreaseLiquidityPositionParams, {
        accounts: decreaseLiquidityPositionAccounts,
      }),
      program.instruction.closeLiquidityPosition({
        accounts: closeLiquidityPositionAccounts,
      }),
    ],
    []
  ).buildAndExecute()

  console.log('Position closed!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
