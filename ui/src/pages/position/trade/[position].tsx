import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import BN from 'bn.js'
import Decimal from 'decimal.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useRouter } from 'next/router'

import PositionRenderCard, { PositionRenderCardSize } from '@/components/PositionRenderCard'
import { ShadowedBox } from '@/components/ShadowedBox'
import { LOCALNET_CONNECTION } from '@/constants'
import { useAppDispatch, useAppSelector, useCladProgram, useTokens } from '@/hooks'
import { closeTradePosition, sortTokenByQuotePriority } from '@/lib'
import { fetchGlobalpool, selectGlobalpool } from '@/slices/globalpool'
import { selectTradePosition } from '@/slices/tradePosition'
import { formatNumber, getTokenAmountsFromLiquidity, isBase58, numScaledFromDecimals, tickToPrice } from '@/utils'

const StyledBox = styled(Box)(() => ({
  padding: '14px 4px',
  borderBottom: '1px solid #e3e4e5',
}))

type TokensOwed = { collateralToken: BN, loanToken: BN }

export default function TradePosition() {
  const dispatch = useAppDispatch()
  const router = useRouter()

  // react-wallet doesn't connect to localnet despite changing the browser wallet RPC,
  // so we manually set it to localnet here (and other places where we use connection)
  const { connection } = process.env.NEXT_PUBLIC_SOLANA_TARGET === 'localnet' ? { connection: LOCALNET_CONNECTION } : useConnection()
  const wallet = useAnchorWallet()
  const program = useCladProgram(connection)

  const { position: candidatePositionKey } = router.query

  const position = useAppSelector(selectTradePosition(candidatePositionKey as string || ''))
  const globalpool = useAppSelector(selectGlobalpool(position ? position.data.globalpool : ''))

  // We want two separate tracks of tokens, for collateral/loan and base/quote
  const [tokenCollateral, tokenLoan] = useTokens([position?.data.tokenMintCollateral, position?.data.tokenMintLoan])

  const [baseToken, quoteToken] = useMemo(() => {
    if (!tokenCollateral || !tokenLoan) return [undefined, undefined]
    return [tokenCollateral, tokenLoan].sort(sortTokenByQuotePriority)
  }, [tokenCollateral, tokenLoan])

  const [tickSpacing, setTickSpacing] = useState<number>(64)
  const [currentPoolTick, setCurrentPoolTick] = useState<number>(0)

  // tokensOwed: scaled to decimal exponent
  const tokensOwed = useMemo(() => {
    if (!position || !globalpool) return { collateralToken: new BN(0), loanToken: new BN(0) }

    const isBorrowA = globalpool.tokenMintA.equals(position.data.tokenMintLoan)

    const roundUp = !isBorrowA
    const tokenAmountsToRepayExpo = getTokenAmountsFromLiquidity(
      position.data.liquidityBorrowed,
      globalpool.sqrtPrice,
      position.data.tickLowerIndex,
      position.data.tickUpperIndex,
      roundUp,
    )

    return {
      loanToken: isBorrowA ? tokenAmountsToRepayExpo.tokenA : tokenAmountsToRepayExpo.tokenB,
      collateralToken: isBorrowA ? tokenAmountsToRepayExpo.tokenB : tokenAmountsToRepayExpo.tokenA,
    } as TokensOwed
  }, [position, globalpool])

  const closePositionHandler = useCallback(async () => {
    if (!connection || !position || !globalpool || !wallet || !program) return
    try {
      await closeTradePosition({
        position,
        positionAuthority: wallet.publicKey,
        maxSlippageBps: 10000, // for test only
        globalpool,
        globalpoolKey: position.data.globalpool,
        program,
        wallet,
      })
    } catch (err) {
      console.error(err)
      toast('Failed to close position', { type: 'error' })
    }
  }, [connection, position, wallet, globalpool, program])

  useEffect(() => {
    if (!position) return
    dispatch(fetchGlobalpool({ key: position.data.globalpool }))
  }, [position])

  useEffect(() => {
    if (!globalpool) return
    setTickSpacing(globalpool.tickSpacing)
    setCurrentPoolTick(globalpool.tickCurrentIndex)
  }, [globalpool])

  if (!candidatePositionKey || typeof candidatePositionKey !== 'string' || !isBase58(candidatePositionKey)) {
    console.error('invalid position key in url')
    // router.push('/position')
    return (<></>)
  }

  if (!position) {
    console.error('position not found')
    // router.push('/position')
    return (
      <Container maxWidth="lg">
        <Typography variant="h6" fontWeight="bold">Position not found!</Typography>
      </Container>
    )
  }

  //
  // Todo: memoize using useMemo
  //
  const isBorrowA = globalpool?.tokenMintA.equals(position.data.tokenMintLoan) || false
  const poolPrice = tickToPrice(globalpool?.tickCurrentIndex || 0, baseToken?.decimals || 9, quoteToken?.decimals || 9)
  const positionLoanValue = new Decimal(numScaledFromDecimals(position.data.loanTokenSwapped, tokenLoan?.decimals || 9))
  let positionCurrentValue = new Decimal(numScaledFromDecimals(position.data.tradeTokenAmount, tokenCollateral?.decimals || 9))
  positionCurrentValue = isBorrowA ? positionCurrentValue.div(poolPrice) : positionCurrentValue.mul(poolPrice)

  const positionPnL = positionCurrentValue.sub(positionLoanValue)

  // First, R = swapped amount + collateral - token collateral owned
  let receivableCollateral = new Decimal(
    numScaledFromDecimals(
      position.data.tradeTokenAmount
        .add(position.data.collateralAmount)
        .sub(tokensOwed.collateralToken),
      tokenCollateral?.decimals || 9
    )
  )

  // Then, R = R - (token loan owed / pool price) = R - token loan amount denominated in token collateral price
  let receivableCollateralSub = new Decimal(numScaledFromDecimals(
    tokensOwed.loanToken,
    tokenLoan?.decimals || 9
  ))
  receivableCollateralSub = isBorrowA ? receivableCollateralSub.mul(poolPrice) : receivableCollateralSub.div(poolPrice)

  receivableCollateral = receivableCollateral.minus(receivableCollateralSub)
  // .sub(
  //   new Decimal(numScaledFromDecimals(tokensOwed.loanToken, tokenLoan?.decimals || 9)).div(poolPrice)
  // )

  return (
    <Container maxWidth="lg">
      <Stack direction="row" alignItems="center" spacing={{ xs: 4, sm: 6, md: 8 }}>
        <PositionRenderCard
          positionKey={position.key}
          tickLowerIndex={position.data.tickLowerIndex}
          tickUpperIndex={position.data.tickUpperIndex}
          tickOpenIndex={position.data.tickOpenIndex}
          tickCurrentIndex={currentPoolTick}
          tickSpacing={tickSpacing}
          amount={position.data.loanTokenSwapped.div(new BN(10 ** 6)).toString()}
          tokenA={tokenCollateral}
          tokenB={tokenLoan}
          size={PositionRenderCardSize.BIG}
        />
        <Stack spacing={3}>
          <ShadowedBox>
            <Typography variant="h6" fontWeight="bold">Trade Position Stats</Typography>
            <StyledBox>
              <Typography variant="body1" fontWeight="bold">Range</Typography>
              <Stack direction="row" justifyContent="flex-start" spacing={3}>
                <Box>
                  <Typography variant="caption" fontWeight="bold">Open Price</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatNumber(tickToPrice(position.data.tickOpenIndex, baseToken?.decimals || 9, quoteToken?.decimals || 9))}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="#999">Lower Price</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatNumber(tickToPrice(position.data.tickLowerIndex, baseToken?.decimals || 9, quoteToken?.decimals || 9))}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="#999">Upper Price</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatNumber(tickToPrice(position.data.tickUpperIndex, baseToken?.decimals || 9, quoteToken?.decimals || 9))}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={4} pt={2}>
                <Box>
                  <Typography variant="caption" fontWeight="bold">Current Pool Price</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatNumber(poolPrice)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="#999">Leverage</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatNumber(
                      new Decimal(position.data.tradeTokenAmount.toString())
                        .div(new Decimal(position.data.collateralAmount.toString())),
                      0,
                      1
                    )}x
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={4} pt={2}>
                <Box>
                  <Typography variant="body2" color="#999">Borrowed</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatNumber(positionLoanValue)}
                    {` ${tokenLoan?.symbol}`}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="#999">Collateral locked</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatNumber(numScaledFromDecimals(position.data.collateralAmount, tokenCollateral?.decimals || 9))}
                    {` ${tokenCollateral?.symbol}`}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="#999">Swapped to</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatNumber(numScaledFromDecimals(position.data.tradeTokenAmount, tokenCollateral?.decimals || 9))}
                    {` ${tokenCollateral?.symbol}`}
                  </Typography>
                </Box>
              </Stack>
            </StyledBox>
            <StyledBox>
              <Typography variant="body1" pb={1}>Tokens owed</Typography>
              <Typography variant="body1" fontWeight="bold">
                {`${formatNumber(numScaledFromDecimals(tokensOwed.loanToken, tokenLoan?.decimals || 9))} ${tokenLoan?.symbol}`}
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {`${formatNumber(numScaledFromDecimals(tokensOwed.collateralToken, tokenCollateral?.decimals || 9))} ${tokenCollateral?.symbol}`}
              </Typography>
            </StyledBox>
            <StyledBox>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="body1">Position Value</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatNumber(positionCurrentValue)}
                    {` ${tokenLoan?.symbol}`}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body1">Unrealized PnL</Typography>
                  <Typography variant="body1" fontWeight="bold" color={positionPnL.gt(0) ? 'green' : 'red'}>
                    {formatNumber(positionPnL)}
                    {` ${tokenLoan?.symbol}`}
                  </Typography>
                </Box>
              </Stack>
            </StyledBox>
            <StyledBox>
              <Box>
                <Typography variant="body1">Receivable on Closing</Typography>
                <Typography variant="body1" fontWeight="bold" pt={1}>
                  {formatNumber(receivableCollateral)}
                  {` ${tokenCollateral?.symbol}`}
                </Typography>
                <Typography variant="body1" color="#999">
                  &#8776; {formatNumber(isBorrowA ? receivableCollateral.div(poolPrice) : receivableCollateral.mul(poolPrice))}
                  {` ${tokenLoan?.symbol}`}
                </Typography>
              </Box>
            </StyledBox>
          </ShadowedBox>
          <Button variant="outlined" color="error" onClick={closePositionHandler}>Close Position</Button>
        </Stack>
      </Stack>
    </Container>
  )
}