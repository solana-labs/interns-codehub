import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import { PriceMath } from '@orca-so/whirlpools-sdk'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { Token } from '@solflare-wallet/utl-sdk'
import Decimal from 'decimal.js'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { LOCALNET_CONNECTION } from '@/constants'
import { useAppDispatch, useCladProgram } from '@/hooks'
import { openTradePosition, calculateProratedInterestRate } from '@/lib'
import { ExpirableGlobalpoolData, fetchGlobalpool } from '@/slices/globalpool'
import { fetchTradePositionsByUser } from '@/slices/tradePosition'
import {
  estimateLiquidityFromTokenAmounts,
  formatNumber,
  formatSecondsToDurationString,
  getTokenAmountsFromLiquidity,
  numScaledFromDecimals,
  numScaledToDecimals,
  priceToNearestTick,
  tickToPrice,
  toTokenAmount
} from '@/utils'

interface LeverageTradeBoxProps {
  globalpool: ExpirableGlobalpoolData | undefined
  isTradeLong: boolean
  baseToken: Token
  quoteToken: Token
}

function invertAmount(amount: number, poolPrice: number, isTradeLong: boolean) {
  return amount * (isTradeLong ? 1 / poolPrice : poolPrice)
}

export function LeverageTradeBox(props: LeverageTradeBoxProps) {
  const {
    globalpool,
    isTradeLong,
    baseToken,
    quoteToken
  } = props

  const baseDecimals = baseToken.decimals || 9
  const quoteDecimals = quoteToken.decimals || 9

  // react-wallet doesn't connect to localnet despite changing the browser wallet RPC,
  // so we manually set it to localnet here (and other places where we use connection)
  const { connection } = process.env.NEXT_PUBLIC_SOLANA_TARGET === 'localnet' ? { connection: LOCALNET_CONNECTION } : useConnection()
  const wallet = useAnchorWallet()
  const program = useCladProgram(connection)
  const dispatch = useAppDispatch()

  const [tradeLowerPrice, setTradeLowerPrice] = useState<number>(0)
  const [tradeUpperPrice, setTradeUpperPrice] = useState<number>(0)
  const [tradeAmount, setTradeAmount] = useState<number>(0) // amount of base or quote token to borrow (to short or long)

  const [errorTickRange, setErrorTickRange] = useState<string | undefined>(undefined) // undefined => no error
  const [estMaxLoss, setEstMaxLoss] = useState<Decimal | undefined>(undefined)
  const [estLeverage, setEstLeverage] = useState<string | undefined>(undefined)
  // const [estInterest, setEstInterest] = useState<number | undefined>(undefined)
  const [estInterestRate, setEstInterestRate] = useState<Decimal | undefined>(undefined)

  // const loanDuration = 604_800 // (= 1 week) TODO: make this dynamic
  const loanDuration = 2419000

  const [isOpeningPosition, setIsOpeningPosition] = useState<boolean>(false)

  const poolPrice = useMemo(() => {
    if (globalpool?.tickCurrentIndex) return tickToPrice(globalpool.tickCurrentIndex, baseDecimals, quoteDecimals)
    return 1
  }, [globalpool])

  const handleOpenPosition = useCallback(async () => {
    if (!globalpool || !wallet || !program || !globalpool.tickCurrentIndex || !tradeLowerPrice || !tradeUpperPrice || !tradeAmount) return
    setIsOpeningPosition(true)

    const lowerPriceTick = priceToNearestTick(tradeLowerPrice, globalpool.tickSpacing, baseDecimals, quoteDecimals)
    const upperPriceTick = priceToNearestTick(tradeUpperPrice, globalpool.tickSpacing, baseDecimals, quoteDecimals)
    const isBorrowA = isTradeLong ? false : true // refer to logic below

    await openTradePosition({
      tickLowerIndex: lowerPriceTick,
      tickUpperIndex: upperPriceTick,
      maxSlippageBps: 1000, // 1% slippage
      borrowAmount: tradeAmount,
      borrowTokenDecimals: isBorrowA ? baseDecimals : quoteDecimals,
      loanDuration,
      positionAuthority: wallet.publicKey,
      globalpool,
      program,
    })

    setIsOpeningPosition(false)
    dispatch(fetchGlobalpool({ key: globalpool._pubkey, ignoreCache: true }))
    dispatch(fetchTradePositionsByUser(wallet.publicKey))
  }, [globalpool, tradeAmount, tradeLowerPrice, tradeUpperPrice, wallet, program])

  useEffect(() => {
    // console.log(globalpool, getTokenAddress(props.baseToken), getTokenAddress(props.quoteToken))
    if (!globalpool || !globalpool.tickCurrentIndex || !connection) return

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
    const tradeAmountExpo = parseFloat(numScaledToDecimals(tradeAmount, isBorrowA ? baseDecimals : quoteDecimals))
    const tradeAmountInBaseToken = invertAmount(tradeAmount, poolPrice, isTradeLong)

    const borrowAmounts = toTokenAmount(
      isBorrowA ? tradeAmountExpo : 0,
      isBorrowA ? 0 : tradeAmountExpo,
    )
    console.log(tradeAmount, borrowAmounts.tokenA.toString(), borrowAmounts.tokenB.toString())

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

    // Scaled down from decimal exponent
    let repayAmount: Decimal // in base token
    if (isBorrowA) {
      repayAmount = new Decimal(numScaledFromDecimals(tokenAmountsToRepayExpo.tokenB, quoteDecimals))
    } else {
      repayAmount = new Decimal(numScaledFromDecimals(tokenAmountsToRepayExpo.tokenA, baseDecimals))
    }

    // console.log('repayAmount', repayAmount.toString(), baseDecimals, quoteDecimals, isBorrowA)
    // console.log('tradeAmountInBaseToken', tradeAmountInBaseToken.toString())
    // console.log('tokenAmountsToRepayExpo.A', tokenAmountsToRepayExpo.tokenA.toString())
    // console.log('tokenAmountsToRepayExpo.B', tokenAmountsToRepayExpo.tokenB.toString())

    const _estMaxLoss = repayAmount.sub(tradeAmountInBaseToken)
    const _estLeverage = new Decimal(tradeAmountInBaseToken).div(_estMaxLoss).toFixed(1)
    setEstMaxLoss(_estMaxLoss)
    setEstLeverage(_estLeverage.slice(-2) === '.0' ? _estLeverage.slice(0, -2) : _estLeverage)

    calculateProratedInterestRate({
      liquidityBorrowed: new Decimal(liquidityBorrow.toString()),
      loanDuration,
      globalpool,
      tickLowerIndex: lowerPriceTick,
      tickUpperIndex: upperPriceTick,
      connection,
    }).then(setEstInterestRate)
  }, [globalpool, connection, poolPrice, tradeLowerPrice, tradeUpperPrice, tradeAmount])

  return (
    <>
      <Box>
        <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Range - Lower Price</Typography>
        <TextField
          type="number"
          variant="outlined"
          color="secondary"
          label=""
          onChange={(e: any) => setTradeLowerPrice(parseFloat(e.target.value) || 0)}
          value={tradeLowerPrice}
          inputProps={{ min: 0 }}
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
          onChange={(e: any) => setTradeUpperPrice(parseFloat(e.target.value) || 0)}
          value={tradeUpperPrice}
          inputProps={{ min: 0 }}
          required
          fullWidth
        />
      </Box>
      <Box pt={2}>
        <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Trade Amount (in {isTradeLong ? quoteToken.symbol : baseToken.symbol})</Typography>
        <TextField
          type="number"
          variant="outlined"
          color="secondary"
          label=""
          onChange={(e: any) => setTradeAmount(parseFloat(e.target.value) || 0)}
          value={tradeAmount}
          inputProps={{ min: 0 }}
          required
          fullWidth
        />
        <Typography variant="caption" color="#999" pb={1}>
          {/* trade amount in opposite token */}
          &#8776; {formatNumber(invertAmount(tradeAmount, poolPrice, isTradeLong))} {isTradeLong ? baseToken.symbol : quoteToken.symbol}
        </Typography>
      </Box>
      <Stack direction={{ md: 'row' }} alignItems="center" justifyContent="space-between" pt={2} spacing={1}>
        <Box>
          <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Collateral (Max Loss)</Typography>
          <Typography variant="body1" fontWeight="bold">
            {estMaxLoss ? `${formatNumber(estMaxLoss.toString())} ${isTradeLong ? baseToken.symbol : quoteToken.symbol}` : '-'}
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
        <Box>
          <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Interest</Typography>
          <Typography variant="body1" fontWeight="bold">
            {estInterestRate ? `${formatNumber(estInterestRate)} ${isTradeLong ? baseToken.symbol : quoteToken.symbol}` : '-'}
          </Typography>
        </Box>
        <Box textAlign="right">
          <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Duration</Typography>
          <Typography variant="body1" fontWeight="bold">{formatSecondsToDurationString(loanDuration)}</Typography>
        </Box>
      </Stack>
      <Box pt={3}>
        <Button variant="outlined" onClick={handleOpenPosition} disabled={isOpeningPosition} fullWidth>Open Position</Button>
      </Box>
      {errorTickRange && <Typography variant="caption" color="red" pt={1}>{errorTickRange}</Typography>}
    </>
  )
}