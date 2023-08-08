import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { PriceMath } from '@orca-so/whirlpools-sdk'
import { useAnchorWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import Decimal from 'decimal.js'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { LOCALNET_CONNECTION } from '@/constants'
import { useCladProgram } from '@/hooks'
import { TokenE, TOKEN_INFO } from '@/lib/Token'
import openTradePosition from '@/lib/openTradePosition'
import { ExpirableGlobalpoolData } from '@/slices/globalpool'
import {
  TokenAmounts,
  estimateLiquidityFromTokenAmounts,
  formatNumber,
  getTokenAmountsFromLiquidity,
  priceToNearestTick,
  tickToPrice,
  toTokenAmount
} from '@/utils'

interface LeverageTradeBoxProps {
  globalpool: ExpirableGlobalpoolData | undefined
  isTradeLong: boolean
  baseToken: TokenE
  quoteToken: TokenE
}

function invertAmount(amount: number, poolPrice: number, isTradeLong: boolean) {
  return amount * (isTradeLong ? 1 / poolPrice : poolPrice)
}

export default function LeverageTradeBox(props: LeverageTradeBoxProps) {
  const {
    globalpool,
    isTradeLong,
    baseToken,
    quoteToken
  } = props

  const baseDecimals = TOKEN_INFO[baseToken].decimals
  const quoteDecimals = TOKEN_INFO[quoteToken].decimals

  // react-wallet doesn't connect to localnet despite changing the browser wallet RPC,
  // so we manually set it to localnet here (and other places where we use connection)
  // const { connection } = useConnection()
  const connection = LOCALNET_CONNECTION

  const wallet = useAnchorWallet()
  const program = useCladProgram(connection)

  const [tradeLowerPrice, setTradeLowerPrice] = useState<number>(1.8)
  const [tradeUpperPrice, setTradeUpperPrice] = useState<number>(2)
  const [tradeAmount, setTradeAmount] = useState<number>(100) // amount of base or quote token to borrow (to short or long)

  const [errorTickRange, setErrorTickRange] = useState<string | undefined>(undefined) // undefined => no error
  const [estMaxLoss, setEstMaxLoss] = useState<Decimal | undefined>(undefined)
  const [estLeverage, setEstLeverage] = useState<string | undefined>(undefined)
  const [estInterest, setEstInterest] = useState<number | undefined>(undefined)
  // const [estInterestRate, setEstInterestRate] = useState<number | undefined>(undefined)

  const loanDuration = 3600 // TODO: make this dynamic

  const [isOpeningPosition, setIsOpeningPosition] = useState<boolean>(false)

  const poolPrice = useMemo(() => {
    if (globalpool?.tickCurrentIndex) return tickToPrice(globalpool.tickCurrentIndex, baseDecimals, quoteDecimals)
    return 1
  }, [globalpool])

  const handleOpenPosition = useCallback(async () => {
    if (!globalpool || !wallet || !program || !globalpool.tickCurrentIndex) return
    setIsOpeningPosition(true)

    const lowerPriceTick = priceToNearestTick(tradeLowerPrice, globalpool.tickSpacing, baseDecimals, quoteDecimals)
    const upperPriceTick = priceToNearestTick(tradeUpperPrice, globalpool.tickSpacing, baseDecimals, quoteDecimals)
    const isBorrowA = isTradeLong ? false : true // refer to logic below

    console.log(isBorrowA ? baseDecimals : quoteDecimals)
    await openTradePosition({
      tickLowerIndex: lowerPriceTick,
      tickUpperIndex: upperPriceTick,
      borrowAmount: tradeAmount,
      borrowTokenDecimals: isBorrowA ? baseDecimals : quoteDecimals,
      loanDuration,
      positionAuthority: wallet.publicKey,
      globalpoolKey: new PublicKey(globalpool._pubkey),
      globalpool,
      program,
    })

    setIsOpeningPosition(false)
  }, [globalpool, wallet, program])

  useEffect(() => {
    // console.log(globalpool, getTokenAddress(props.baseToken), getTokenAddress(props.quoteToken))
    if (!globalpool || !globalpool.tickCurrentIndex) return

    const lowerPriceTick = priceToNearestTick(tradeLowerPrice, globalpool.tickSpacing, baseDecimals, quoteDecimals)
    const upperPriceTick = priceToNearestTick(tradeUpperPrice, globalpool.tickSpacing, baseDecimals, quoteDecimals)

    //
    // Logic:
    //
    // Long  => Borrow Quote (B) & Swap to Base (A) 
    //       => Upper Tick must be lower than Current Tick (because Token B is in the ticks left to the current pool tick)
    //       => (Lower Tick also lower than Current Tick, implied from 1st condition)
    // Short => Borrow Base (A) & Swap to Quote (B)
    //       => Lower Tick must be higher than Current Tick (because Token A is in the ticks right to the current pool tick)
    //       => (Upper Tick also higher than Current Tick, implied from 1st condition)
    //

    if (lowerPriceTick >= upperPriceTick) {
      setErrorTickRange('Lower tick must be less than upper tick')
      return
    } else if (isTradeLong && upperPriceTick >= globalpool.tickCurrentIndex) {
      setErrorTickRange('Invalid Long Ticks')
      return
    } else if (!isTradeLong && lowerPriceTick <= globalpool.tickCurrentIndex) {
      setErrorTickRange('Invalid Short Ticks')
      return
    } else {
      // Reset if all conditions are unmet AND errorTickRange is not undefined
      setErrorTickRange(undefined)
    }

    const isBorrowA = isTradeLong ? false : true // refer to logic above
    // const isCollateralA = !isBorrowA

    // Trade amount with decimals scaled
    const tradeAmountExpo = tradeAmount * (10 ** (isBorrowA ? baseDecimals : quoteDecimals))
    const tradeAmountInBaseToken = invertAmount(tradeAmount, poolPrice, isTradeLong)

    const borrowAmounts = toTokenAmount(
      isBorrowA ? tradeAmountExpo : 0,
      isBorrowA ? 0 : tradeAmountExpo,
    )

    const liquidityBorrow = estimateLiquidityFromTokenAmounts(
      globalpool.tickCurrentIndex,
      lowerPriceTick,
      upperPriceTick,
      borrowAmounts
    )

    const roundUp = !isBorrowA
    const tokenAmountsToRepayExpo = getTokenAmountsFromLiquidity(
      liquidityBorrow,
      PriceMath.tickIndexToSqrtPriceX64(isBorrowA ? upperPriceTick + globalpool.tickSpacing : lowerPriceTick - globalpool.tickSpacing),
      lowerPriceTick,
      upperPriceTick,
      roundUp,
    )

    // console.log('token base', tokenAmountsToRepayExpo.tokenA.toNumber() / 10 ** baseDecimals)
    // console.log('token quote', tokenAmountsToRepayExpo.tokenB.toNumber() / 10 ** quoteDecimals)

    // Scaled down from decimal exponent
    let repayAmount: Decimal // in base token
    if (isBorrowA) {
      repayAmount = new Decimal(tokenAmountsToRepayExpo.tokenB.toString()).div(10 ** quoteDecimals)
    } else {
      repayAmount = new Decimal(tokenAmountsToRepayExpo.tokenA.toString()).div(10 ** baseDecimals)
    }

    console.log('repayAmount', repayAmount.toString())
    console.log('tradeAmountInBaseToken', tradeAmountInBaseToken.toString())

    const _estMaxLoss = repayAmount.sub(tradeAmountInBaseToken)
    const _estLeverage = new Decimal(tradeAmountInBaseToken).div(_estMaxLoss).toFixed(1)
    setEstMaxLoss(_estMaxLoss)
    setEstLeverage(_estLeverage.slice(-2) === '.0' ? _estLeverage.slice(0, -2) : _estLeverage)
  }, [globalpool, poolPrice, tradeLowerPrice, tradeUpperPrice, tradeAmount])

  return (
    <>
      <Box>
        <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Range - Lower Price</Typography>
        <TextField
          type="number"
          variant="outlined"
          color="secondary"
          label=""
          onChange={e => setTradeLowerPrice(parseFloat(e.target.value))}
          value={tradeLowerPrice}
          required
          fullWidth
        />
      </Box>
      <Box pt={2}>
        <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Range - Upper Price</Typography>
        <TextField
          type="number"
          variant="outlined"
          color="secondary"
          label=""
          onChange={e => setTradeUpperPrice(parseFloat(e.target.value))}
          value={tradeUpperPrice}
          required
          fullWidth
        />
      </Box>
      <Box pt={2}>
        <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Trade Amount (in {isTradeLong ? quoteToken : baseToken})</Typography>
        <TextField
          type="number"
          variant="outlined"
          color="secondary"
          label=""
          onChange={e => setTradeAmount(parseFloat(e.target.value))}
          value={tradeAmount}
          required
          fullWidth
        />
        <Typography variant="caption" color="#999" pb={1}>
          {/* trade amount in opposite token */}
          &#8776; {formatNumber(invertAmount(tradeAmount, poolPrice, isTradeLong))} {isTradeLong ? baseToken : quoteToken}
        </Typography>
      </Box>
      <Stack direction={{ md: 'row' }} alignItems="center" justifyContent="space-between" pt={2} spacing={1}>
        <Box>
          <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Collateral (Max Loss)</Typography>
          <Typography variant="body1" fontWeight="bold">
            {estMaxLoss ? `${formatNumber(estMaxLoss.toString())} ${isTradeLong ? baseToken : quoteToken}` : '-'}
          </Typography>
        </Box>
        <Box textAlign="right">
          <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Leverage</Typography>
          <Typography variant="body1" fontWeight="bold">
            {estLeverage ? `${estLeverage}x` : '-'}
          </Typography>
        </Box>
      </Stack>
      <Stack direction={{ md: 'row' }} alignItems="center" justifyContent="space-between" spacing={1}>
        <Box textAlign="right">
          <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Interest</Typography>
          <Typography variant="body1" fontWeight="bold">
            {estInterest ? `${estInterest} ${isTradeLong ? quoteToken : baseToken}` : '-'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Duration</Typography>
          <Typography variant="body1" fontWeight="bold">7 days</Typography>
        </Box>
      </Stack>
      <Box pt={3}>
        <Button variant="outlined" onClick={handleOpenPosition} disabled={isOpeningPosition} fullWidth>Open Position</Button>
      </Box>
      {errorTickRange && <Typography variant="caption" color="red" pt={1}>{errorTickRange}</Typography>}
    </>
  )
}