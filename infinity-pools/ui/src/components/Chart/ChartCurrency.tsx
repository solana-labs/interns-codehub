import ChevronDownIcon from '@carbon/icons-react/lib/ChevronDown'
import { Box, Stack, Typography } from '@mui/material'
import { Token } from '@solflare-wallet/utl-sdk'
import Image from 'next/image'
import { useMemo, useState } from 'react'

import { TokenSelectorList } from '@/components/TokenSelectorList'
import { useAppSelector } from '@/hooks'
import { selectGlobalpools } from '@/slices/globalpool'
import { parseAllTokensFromPools } from '@/utils/token'

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
    return parseAllTokensFromPools(globalpools, supportedTokens)
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