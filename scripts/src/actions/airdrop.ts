import * as anchor from '@coral-xyz/anchor'
import { getConstantParams } from '../params'
import { createAndMintToManyATAs } from '../utils/token'

async function main() {
  const {
    provider,
    wallet,
    tokenMintA,
    tokenMintB,
  } = await getConstantParams()

  const mintAmount = new anchor.BN(100_000) // 100k of each tokens
  const positionAuthority = wallet.publicKey

  console.log('Token A: ', tokenMintA.address.toBase58())
  console.log('Token B: ', tokenMintB.address.toBase58())

  const [authorityTokenAccountA, authorityTokenAccountB] =
    await createAndMintToManyATAs(
      provider,
      [tokenMintA, tokenMintB],
      mintAmount,
      positionAuthority
    )

  console.log('Associated Token Account A: ', authorityTokenAccountA.toBase58())
  console.log('Associated Token Account B: ', authorityTokenAccountB.toBase58())
}

main()
  .then(() => console.log('Successfully airdropped tokens'))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })