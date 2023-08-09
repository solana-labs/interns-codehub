import { Box } from '@mui/material'
import { useState } from 'react'

import ShadowedBox from '@/components/ShadowedBox'
import SwapPoolBox from '@/components/SwapPoolBox'
import { StyledTab, StyledTabs } from '@/components/StyledTab'
import { useAppSelector } from '@/hooks'
import { TokenE, getTokenAddress } from '@/lib/Token'
import { selectGlobalpoolByMints } from '@/slices/globalpool'
import LeverageTradeBox from '../LeverageTradeBox'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  if (value !== index) return (<></>)

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      <Box sx={{ p: 3, mt: 1 }}>
        {children}
      </Box>
    </div>
  )
}

interface TradeBoxProps {
  baseToken: TokenE
  quoteToken: TokenE
}

export default function TradeBox(props: TradeBoxProps) {
  const { baseToken, quoteToken } = props

  const globalpool = useAppSelector(selectGlobalpoolByMints(getTokenAddress(baseToken), getTokenAddress(quoteToken)))
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