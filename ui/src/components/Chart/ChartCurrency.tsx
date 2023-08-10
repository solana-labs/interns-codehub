import ChevronDownIcon from '@carbon/icons-react/lib/ChevronDown'
import { Box, Stack, Typography } from '@mui/material'
import { Token } from '@solflare-wallet/utl-sdk'
import Image from 'next/image'
import { useMemo, useState } from 'react'

import TokenSelectorList from '@/components/TokenSelectorList'
import { useAppSelector } from '@/hooks'
import { sortTokenByQuotePriority } from '@/lib'
import { selectGlobalpools } from '@/slices/globalpool'

interface ChartCurrencyProps {
  baseToken: Token
  quoteToken: Token
  supportedTokens: Record<string, Token>
}

export function ChartCurrency(props: ChartCurrencyProps) {
  const { baseToken, quoteToken, supportedTokens } = props

  const [selectorOpen, setSelectorOpen] = useState(false)

  const globalpools = useAppSelector(selectGlobalpools)

  // Get token-pair of all globalpools
  const tokenList = useMemo(() => {
    if (!globalpools || !supportedTokens) return [] as { base: Token, quote: Token }[]

    return Object.values(globalpools)
      .map((globalpool) => {
        const tokenA = supportedTokens[globalpool.tokenMintA.toString()]
        const tokenB = supportedTokens[globalpool.tokenMintB.toString()]

        if (!tokenA || !tokenB) return undefined // filtered out

        // Need to order the pair
        const [baseToken, quoteToken] = [tokenA, tokenB].sort(sortTokenByQuotePriority) as [Token, Token]
        return { base: baseToken, quote: quoteToken }
      })
      .filter((x) => !!x) as { base: Token, quote: Token }[]
  }, [globalpools, supportedTokens])

  if (!baseToken || !quoteToken) return (<></>)

  return (
    <>
      <Box display="inline-block">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-start"
          spacing={2}
          onClick={() => setSelectorOpen((cur) => !cur)}
          sx={{ cursor: 'pointer' }}
        >
          <Image src={baseToken.logoURI || '/'} alt={baseToken.symbol} width={50} height={50} />
          <Typography variant="h5" fontWeight="bold">{baseToken.symbol}/{quoteToken.symbol}</Typography>
          <Box p={1} border="1px solid #000" borderRadius="50%">
            <ChevronDownIcon size={16} fill="#000" />
          </Box>
        </Stack>
      </Box>
      <TokenSelectorList
        isSelectorOpen={selectorOpen}
        setIsSelectorOpen={setSelectorOpen}
        tokenList={tokenList}
      />
    </>
  )
}