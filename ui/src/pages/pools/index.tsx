import { Box, Container, Typography } from '@mui/material'
import { useEffect, useMemo } from 'react'

import ShadowedBox from '@/components/ShadowedBox'
import { useAppSelector } from '@/hooks'
import { ExpirableGlobalpoolData, selectGlobalpools } from '@/slices/globalpool'
import { formatNumber, tickToPrice, truncatedAddress } from '@/utils'
import { TOKEN_INFO, tokenAddressToToken } from '@/lib'

interface PoolPreviewProps {
  globalpool: ExpirableGlobalpoolData
}

function PoolPreview(props: PoolPreviewProps) {
  const { globalpool } = props
  const globalpoolKey = globalpool._pubkey

  const [
    tokenMintA,
    tokenMintB,
    tokenMintInfoA,
    tokenMintInfoB
  ] = useMemo(() => {
    const mintA = tokenAddressToToken(globalpool.tokenMintA)
    const mintB = tokenAddressToToken(globalpool.tokenMintB)
    const tokenInfoA = mintA ? TOKEN_INFO[mintA] : null
    const tokenInfoB = mintB ? TOKEN_INFO[mintB] : null

    return [mintA, mintB, tokenInfoA, tokenInfoB]
  }, [globalpool])

  if (!tokenMintA || !tokenMintB || !tokenMintInfoA || !tokenMintInfoB) return (<></>)
  console.log('decimals', tokenMintInfoA.decimals, tokenMintInfoB.decimals)

  return (
    <Box maxWidth={300} p={2}>
      <ShadowedBox>
        <Typography variant="h6" fontWeight="bold">{truncatedAddress(globalpoolKey)}</Typography>
        <Typography variant="body1" pt={1}>Fee: {globalpool.feeRate / 100}%</Typography>
        <Typography variant="body1" pt={1}>Token A: {truncatedAddress(globalpool.tokenMintA.toString())}</Typography>
        <Typography variant="body1" pt={1}>Token B: {truncatedAddress(globalpool.tokenMintB.toString())}</Typography>
        <Typography variant="body1" pt={1}>Tick Spacing: {globalpool.tickSpacing}</Typography>
        <Typography variant="body1" pt={1}>Current Tick: {globalpool.tickCurrentIndex}</Typography>
        <Typography variant="body1" pt={1}>Current Price: {formatNumber(tickToPrice(globalpool.tickCurrentIndex, tokenMintInfoA.decimals, tokenMintInfoB.decimals))}</Typography>
        <Typography variant="body1" pt={1}>Liquidity Available: {formatNumber(globalpool.liquidityAvailable.toString())}</Typography>
        <Typography variant="body1" pt={1}>Liquidity Borrowed: {formatNumber(globalpool.liquidityBorrowed.toString())}</Typography>
      </ShadowedBox>
    </Box>
  )
}

export default function PoolsIndexPage() {
  const globalpools = useAppSelector(selectGlobalpools)

  return (
    <Container maxWidth="lg">
      <Box>
        {globalpools && Object.values(globalpools).map((globalpool) => <PoolPreview key={globalpool._pubkey} globalpool={globalpool} />)}
      </Box>
    </Container>
  )
}