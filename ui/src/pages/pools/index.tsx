import { Box, Container, Stack, Typography } from '@mui/material'
import { Token } from '@solflare-wallet/utl-sdk'
import { useMemo } from 'react'
import Image from 'next/image'

import { ShadowedBox } from '@/components/ShadowedBox'
import { useAppSelector } from '@/hooks'
import { sortTokenByQuotePriority } from '@/lib'
import { selectTokens } from '@/slices/generic'
import { ExpirableGlobalpoolData, selectGlobalpools } from '@/slices/globalpool'
import { formatNumber, tickToPrice, truncatedAddress } from '@/utils'

interface PoolPreviewProps {
  globalpool: ExpirableGlobalpoolData
  supportedTokens: Record<string, Token>
}

function PoolPreview(props: PoolPreviewProps) {
  const { globalpool, supportedTokens } = props
  const globalpoolKey = globalpool._pubkey

  const [baseToken, quoteToken] = useMemo(() => {
    const tokenA = supportedTokens[globalpool.tokenMintA.toString()]
    const tokenB = supportedTokens[globalpool.tokenMintB.toString()]

    if (!tokenA || !tokenB) return [undefined, undefined]

    // Need to order the pair as [base, quote]
    return [tokenA, tokenB].sort(sortTokenByQuotePriority) as [Token, Token]
  }, [globalpool, supportedTokens])

  if (!baseToken || !quoteToken) return (<></>)

  const baseDecimals = baseToken.decimals || 9
  const quoteDecimals = quoteToken.decimals || 9

  return (
    <Box width={{ xs: '100%', md: '33.3333%' }} p={2} display="inline-block">
      <ShadowedBox>
        <Stack direction="row" spacing={2} pb={1}>
          <Image src={baseToken.logoURI || ''} alt={baseToken.symbol} width={40} height={40} />
          <Image src={quoteToken.logoURI || ''} alt={quoteToken.symbol} width={40} height={40} />
        </Stack>
        <Typography variant="h6" fontWeight="bold">{baseToken.symbol}/{quoteToken.symbol}</Typography>
        <Typography variant="body1" pt={1}>Pool: {truncatedAddress(globalpoolKey)}</Typography>
        <Typography variant="body1" pt={1}>Fee: {globalpool.feeRate / 10000}%</Typography>
        <Box>
          <Typography variant="body1" pt={1}>Token A: {baseToken.symbol} ({truncatedAddress(baseToken.address)})</Typography>
        </Box>
        <Box>
          <Typography variant="body1" pt={1}>Token B: {quoteToken.symbol} ({truncatedAddress(quoteToken.address)})</Typography>
        </Box>
        <Typography variant="body1" pt={1}>Tick Spacing: {globalpool.tickSpacing}</Typography>
        <Typography variant="body1" pt={1}>Current Tick: {globalpool.tickCurrentIndex}</Typography>
        <Typography variant="body1" pt={1}>Current Price: {formatNumber(tickToPrice(globalpool.tickCurrentIndex, baseDecimals, quoteDecimals))}</Typography>
        <Typography variant="body1" pt={1}>Liquidity Available: {formatNumber(globalpool.liquidityAvailable.toString())}</Typography>
        <Typography variant="body1" pt={1}>Liquidity Borrowed: {formatNumber(globalpool.liquidityBorrowed.toString())}</Typography>
      </ShadowedBox>
    </Box>
  )
}

export default function PoolsIndexPage() {
  const globalpools = useAppSelector(selectGlobalpools)
  const tokens = useAppSelector(selectTokens)

  return (
    <Container maxWidth="lg">
      <Box>
        {Object.values(globalpools).map((globalpool) => (
          <PoolPreview key={globalpool._pubkey} globalpool={globalpool} supportedTokens={tokens} />
        ))}
      </Box>
    </Container>
  )
}