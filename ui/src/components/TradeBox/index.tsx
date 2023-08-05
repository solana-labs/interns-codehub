import { Box, Container, Stack, TextField, Typography } from '@mui/material'
import { PriceMath } from '@orca-so/whirlpools-sdk'
import { useEffect, useState } from 'react'

import ShadowedBox from '@/components/ShadowedBox'
import { StyledTab, StyledTabs } from '@/components/StyledTab'
import { useAppSelector } from '@/hooks'
import { TokenE, getTokenAddress } from '@/lib/Token'
import { estimateLiquidityFromTokenAmounts, formatNumber, getTokenAmountsFromLiquidity, priceToNearestTick, toTokenAmount } from '@/utils'
import { selectGlobalpoolByMints } from '@/slices/globalpool'

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
  const globalpool = useAppSelector(selectGlobalpoolByMints(getTokenAddress(props.baseToken), getTokenAddress(props.quoteToken)))
  const [tabValue, setTabValue] = useState(0)

  const [tradeLowerPrice, setTradeLowerPrice] = useState<number>(1.8)
  const [tradeUpperPrice, setTradeUpperPrice] = useState<number>(2)
  const [tradeAmount, setTradeAmount] = useState<number>(100) // amount of base or quote token to borrow (to short or long)
  const [errorTickRange, setErrorTickRange] = useState<string | undefined>(undefined) // undefined => no error
  const [maxLoss, setMaxLoss] = useState<string>()
  const [isTradeLong, setIsTradeLong] = useState<boolean>(true)

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // first tab = long, second tab = short, skip third tab to prevent triggering useEffect
    if (newValue === 0) setIsTradeLong(true)
    else if (newValue === 1) setIsTradeLong(false)
    setTabValue(newValue)
  }
  useEffect(() => {
    console.log(globalpool, getTokenAddress(props.baseToken), getTokenAddress(props.quoteToken))
    if (!globalpool || !globalpool.tickCurrentIndex) return

    const lowerPriceTick = priceToNearestTick(tradeLowerPrice, globalpool.tickSpacing)
    const upperPriceTick = priceToNearestTick(tradeUpperPrice, globalpool.tickSpacing)

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
    } else if (isTradeLong && upperPriceTick >= globalpool?.tickCurrentIndex) {
      setErrorTickRange('Invalid Long Ticks')
    } else if (!isTradeLong && lowerPriceTick >= globalpool?.tickCurrentIndex) {
      setErrorTickRange('Invalid Short Ticks')
    } else if (!!errorTickRange) {
      // Reset if all conditions are unmet AND errorTickRange is not undefined
      setErrorTickRange(undefined)
    }

    const isBorrowA = isTradeLong ? false : true // refer to logic above
    const isCollateralA = !isBorrowA

    const liquidityBorrow = estimateLiquidityFromTokenAmounts(
      globalpool.tickCurrentIndex,
      lowerPriceTick,
      upperPriceTick,
      toTokenAmount(
        isBorrowA ? tradeAmount : 0,
        isBorrowA ? 0 : tradeAmount,
      )
    )

    const estMaxLossAB = getTokenAmountsFromLiquidity(
      liquidityBorrow,
      PriceMath.tickIndexToSqrtPriceX64(globalpool.tickCurrentIndex),
      lowerPriceTick,
      upperPriceTick,
      isBorrowA,
    )
    console.log(isBorrowA, liquidityBorrow, estMaxLossAB)

    const estMaxLoss = isCollateralA ? estMaxLossAB.tokenA.toString() : estMaxLossAB.tokenB.toString()
    setMaxLoss(estMaxLoss)
  }, [globalpool, tradeLowerPrice, tradeUpperPrice, tradeAmount, errorTickRange])

  return (
    <ShadowedBox sx={{ px: { xs: 2, md: 4 }, minWidth: { xs: '100%', md: 400 } }}>
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
          <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Trade Amount</Typography>
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
        </Box>
        <Box pt={2}>
          <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Max Loss</Typography>
          <Typography variant="body1" fontWeight="bold">
            {maxLoss ? `${formatNumber(maxLoss)} ${props.baseToken}` : '-'}
          </Typography>
        </Box>
      </CustomTabPanel>
      <CustomTabPanel value={tabValue} index={1}>
        Item Two
      </CustomTabPanel>
      <CustomTabPanel value={tabValue} index={2}>
        Item Three
      </CustomTabPanel>
    </ShadowedBox>
  )
}