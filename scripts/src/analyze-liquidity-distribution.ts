import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import {
  WhirlpoolContext,
  ORCA_WHIRLPOOL_PROGRAM_ID,
  ORCA_WHIRLPOOLS_CONFIG,
  buildWhirlpoolClient,
  PDAUtil,
  PriceMath,
  TickUtil,
  TICK_ARRAY_SIZE,
} from '@orca-so/whirlpools-sdk'
import { Wallet, BN } from '@coral-xyz/anchor'

const RPC_ENDPOINT_URL = 'https://ssc-dao.genesysgo.net'

async function main() {
  const connection = new Connection(RPC_ENDPOINT_URL)
  console.log('connection endpoint', connection.rpcEndpoint)

  const dummy_wallet = new Wallet(Keypair.generate())
  const ctx = WhirlpoolContext.from(
    connection,
    dummy_wallet,
    ORCA_WHIRLPOOL_PROGRAM_ID
  )
  const client = buildWhirlpoolClient(ctx)

  // famous tokens
  const SOL = {
    mint: new PublicKey('So11111111111111111111111111111111111111112'),
    decimals: 9,
  }
  const ORCA = {
    mint: new PublicKey('orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE'),
    decimals: 6,
  }
  const WBTC = {
    mint: new PublicKey('9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E'),
    decimals: 6,
  }
  const WETH = {
    mint: new PublicKey('7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs'),
    decimals: 8,
  }
  const MSOL = {
    mint: new PublicKey('mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So'),
    decimals: 9,
  }
  const MNDE = {
    mint: new PublicKey('MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey'),
    decimals: 9,
  }
  const SAMO = {
    mint: new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'),
    decimals: 9,
  }
  const USDC = {
    mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    decimals: 6,
  }
  const USDT = {
    mint: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
    decimals: 6,
  }
  const TICK_SPACING_STABLE = 1
  const TICK_SPACING_STANDARD = 64

  // select input
  // The list of Orca UI supported whirlpools. (it contains tokenMintA, tokenMintB and tickSpacing)
  // https://orca-so.gitbook.io/orca-developer-portal/whirlpools/interacting-with-the-protocol/orca-whirlpools-parameters#orca-ui-supported-whirlpools
  const token_a = SOL
  const token_b = USDC
  const tick_spacing = TICK_SPACING_STANDARD

  // get whirlpool
  const whirlpool_key = PDAUtil.getWhirlpool(
    ORCA_WHIRLPOOL_PROGRAM_ID,
    ORCA_WHIRLPOOLS_CONFIG,
    token_a.mint,
    token_b.mint,
    tick_spacing
  ).publicKey
  console.log('whirlpool_key', whirlpool_key.toBase58())
  const whirlpool = client.getPool(whirlpool_key)
  const whirlpool_data = (await whirlpool).getData()

  // get tickarray pubkeys
  // -3 to +3 tickarrays
  const TICKARRAY_LOWER_OFFSET = -3
  const TICKARRAY_UPPER_OFFSET = +3
  const tickarray_start_indexes: number[] = []
  const tickarray_pubkeys: PublicKey[] = []
  for (
    let offset = TICKARRAY_LOWER_OFFSET;
    offset <= TICKARRAY_UPPER_OFFSET;
    offset++
  ) {
    const start_tick_index = TickUtil.getStartTickIndex(
      whirlpool_data.tickCurrentIndex,
      tick_spacing,
      offset
    )
    const pda = PDAUtil.getTickArrayFromTickIndex(
      start_tick_index,
      tick_spacing,
      whirlpool_key,
      ORCA_WHIRLPOOL_PROGRAM_ID
    )
    tickarray_start_indexes.push(start_tick_index)
    tickarray_pubkeys.push(pda.publicKey)
  }

  // get tickarrays
  const tickarrays = await ctx.fetcher.listTickArrays(tickarray_pubkeys, true)

  // sweep liquidity
  const current_initializable_tick_index =
    Math.floor(whirlpool_data.tickCurrentIndex / tick_spacing) * tick_spacing
  const current_pool_liquidity = whirlpool_data.liquidity
  const liquidity_distribution = []
  let liquidity = new BN(0)
  let liquidity_difference = new BN(0)
  for (let ta = 0; ta < tickarrays.length; ta++) {
    const tickarray = tickarrays[ta]

    for (let i = 0; i < TICK_ARRAY_SIZE; i++) {
      const tick_index = tickarray_start_indexes[ta] + i * tick_spacing

      // move right (add liquidityNet)
      liquidity =
        tickarray == null
          ? liquidity
          : liquidity.add(tickarray.ticks[i].liquidityNet)

      liquidity_distribution.push({ tick_index, liquidity })

      // liquidity in TickArray not read
      if (tick_index === current_initializable_tick_index) {
        liquidity_difference = current_pool_liquidity.sub(liquidity)
      }
    }
  }

  // adjust (liquidity in TickArray not read)
  for (let i = 0; i < liquidity_distribution.length; i++) {
    liquidity_distribution[i].liquidity =
      liquidity_distribution[i].liquidity.add(liquidity_difference)
  }

  // print liquidity distribution
  for (let i = 0; i < liquidity_distribution.length; i++) {
    const L = liquidity_distribution[i]
    console.log(
      'tick_index:',
      L.tick_index.toString().padStart(6, ' '),
      '/ price:',
      PriceMath.tickIndexToPrice(
        L.tick_index,
        token_a.decimals,
        token_b.decimals
      )
        .toFixed(token_b.decimals)
        .toString()
        .padStart(11, ' '),
      '/ liquidity:',
      L.liquidity.toString().padStart(20, ' '),
      L.tick_index === current_initializable_tick_index ? ' <== CURRENT' : ''
    )
  }

  console.log('current pool liquidity:', current_pool_liquidity.toString())
  console.log('current index:', whirlpool_data.tickCurrentIndex)
  console.log(
    'current initializable tick index:',
    current_initializable_tick_index
  )
  console.log(
    'liquidity difference (liquidity in TickArray not read):',
    liquidity_difference.toString()
  )
}

main()
