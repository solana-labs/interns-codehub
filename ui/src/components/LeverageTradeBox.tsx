import type { OutlinedInputProps, SxProps, TextFieldProps } from '@mui/material'
import { Box, InputBase, Stack, TextField, Typography } from '@mui/material'
import { alpha, styled } from '@mui/material/styles'
import { useState } from 'react'

import ShadowedBox from '@/components/ShadowedBox'
import { TokenE } from '@/lib/Token'

interface LeverageTradeBoxProps {
  className?: string
  sx?: SxProps
  baseToken?: TokenE
  quoteToken?: TokenE
}

const RedditTextField = styled((props: TextFieldProps) => (
  <TextField
    InputProps={{ disableUnderline: true } as Partial<OutlinedInputProps>}
    {...props}
  />
))(({ theme }) => ({
  '& .MuiFilledInput-root': {
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: theme.palette.mode === 'light' ? '#F3F6F9' : '#1A2027',
    border: '1px solid',
    borderColor: theme.palette.mode === 'light' ? '#E0E3E7' : '#2D3843',
    color: '#111',
    transition: theme.transitions.create([
      'border-color',
      'background-color',
      'box-shadow',
    ]),
    '&:hover': {
      backgroundColor: 'transparent',
    },
    '&.Mui-focused': {
      backgroundColor: 'transparent',
      boxShadow: `${alpha(theme.palette.primary.main, 0.25)} 0 0 0 2px`,
      borderColor: '#111', // theme.palette.primary.main,
    },
  },
}));

export default function LeverageTradeBox(props: LeverageTradeBoxProps) {
  const [amount, setAmount] = useState<number>(0)

  return (
    <ShadowedBox sx={{ width: '100%', bgcolor: '#f6f7f8', py: { xs: 2, md: 3 }, px: { xs: 2, md: 4 } }}>
      <Typography variant="body1" fontWeight="bold">Leverage Trade</Typography>
      <Box component="form" noValidate autoComplete="off" mt={3}>
        <RedditTextField
          required
          id="trade-amount"
          label="Trade Amount"
          type="number"
          value={amount}
          size="medium"
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <Box py={1}>
          <Typography variant="body2" fontWeight="bold">Collateral Required</Typography>
        </Box>
      </Box>
    </ShadowedBox>
  )
}