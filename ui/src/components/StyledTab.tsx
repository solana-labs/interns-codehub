import * as React from 'react'
import { styled } from '@mui/material/styles'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'

interface StyledTabsProps {
  children?: React.ReactNode
  value: number
  onChange: (event: React.SyntheticEvent, newValue: number) => void
}

export const StyledTabs = styled((props: StyledTabsProps) => (
  <Tabs
    {...props}
    TabIndicatorProps={{ children: <span className="MuiTabs-indicatorSpan" /> }}
  />
))({
  '& .MuiTabs-indicator': {
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  '& .MuiTabs-indicatorSpan': {
    margin: '0 20px',
    width: '100%',
    backgroundColor: '#635ee7',
  },
}) as typeof Tabs

interface StyledTabProps {
  label: string
}

export const StyledTab = styled((props: StyledTabProps) => (
  <Tab disableRipple {...props} />
))(({ theme }) => ({
  textTransform: 'none',
  fontWeight: theme.typography.fontWeightBold,
  fontSize: theme.typography.pxToRem(15),
  marginRight: theme.spacing(1),
  color: 'rgba(30, 30, 30, 0.7)',
  '&.Mui-selected': {
    color: 'rgb(30, 30, 30)',
  },
  '&.Mui-focusVisible': {
    backgroundColor: 'rgba(100, 95, 228, 0.32)',
  },
})) as typeof Tab