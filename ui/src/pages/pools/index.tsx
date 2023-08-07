import { Box, Container, Typography } from "@mui/material"
import { useEffect } from "react"

import ShadowedBox from "@/components/ShadowedBox"
import { useAppSelector } from '@/hooks'
import { ExpirableGlobalpoolData, selectGlobalpools } from "@/slices/globalpool"
import { formatNumber, truncatedAddress } from "@/utils"

interface PoolPreviewProps {
  globalpool: ExpirableGlobalpoolData
}

function PoolPreview(props: PoolPreviewProps) {
  const { globalpool } = props
  const globalpoolKey = globalpool._pubkey

  return (
    <Box maxWidth={300} p={2}>
      <ShadowedBox>
        <Typography variant="h6" fontWeight="bold">{truncatedAddress(globalpoolKey)}</Typography>
        <Typography variant="body1" pt={1}>Fee: {globalpool.feeRate / 100}%</Typography>
        <Typography variant="body1" pt={1}>Token A: {truncatedAddress(globalpool.tokenMintA.toString())}</Typography>
        <Typography variant="body1" pt={1}>Token B: {truncatedAddress(globalpool.tokenMintB.toString())}</Typography>
        <Typography variant="body1" pt={1}>Tick Spacing: {globalpool.tickSpacing}</Typography>
        <Typography variant="body1" pt={1}>Tick Current Index: {globalpool.tickCurrentIndex}</Typography>
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