import { Box } from '@mui/material'
import { Token } from '@solflare-wallet/utl-sdk'
import { useState } from 'react'

import { CustomTabPanel } from '@/components/CustomTabPanel'
import { ShadowedBox } from '@/components/ShadowedBox'
import { SwapPoolBox } from '@/components/SwapPoolBox'
import { StyledTab, StyledTabs } from '@/components/StyledTab'
import { LeverageTradeBox } from '@/components/LeverageTradeBox'
import { ExpirableGlobalpoolData } from '@/slices/globalpool'

interface TradeBoxProps {
  baseToken: Token
  quoteToken: Token
  globalpool: ExpirableGlobalpoolData
}

export function TradeBox(props: TradeBoxProps) {
  const { baseToken, quoteToken, globalpool } = props

  const [tabValue, setTabValue] = useState(0)

  const handleTabChange = (e: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  return (
    <ShadowedBox sx={{ px: { xs: 2, md: 4 }, pb: 1, minWidth: { xs: '100%', md: 400 } }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }} width="100%">
        <StyledTabs
          value={tabValue}
          onChange={handleTabChange}
          centered
        >
          <StyledTab label="Long" />
          <StyledTab label="Short" />
          <StyledTab label="Swap" />
        </StyledTabs>
      </Box>
      <CustomTabPanel value={tabValue} index={0}>
        <LeverageTradeBox isTradeLong={true} globalpool={globalpool} baseToken={baseToken} quoteToken={quoteToken} />
      </CustomTabPanel>
      <CustomTabPanel value={tabValue} index={1}>
        <LeverageTradeBox isTradeLong={false} globalpool={globalpool} baseToken={baseToken} quoteToken={quoteToken} />
      </CustomTabPanel>
      <CustomTabPanel value={tabValue} index={2}>
        <SwapPoolBox globalpool={globalpool} baseToken={baseToken} quoteToken={quoteToken} />
      </CustomTabPanel>
    </ShadowedBox>
  )
}