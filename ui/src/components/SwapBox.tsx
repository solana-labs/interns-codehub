import type { SxProps } from '@mui/material'
import { Box, InputBase, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'

import ShadowedBox from '@/components/ShadowedBox'
import { CustomTextField } from '@/components/TextField'
import { TokenE } from '@/lib/Token'

interface SwapBoxProps {
  className?: string
  sx?: SxProps
  baseToken?: TokenE
  quoteToken?: TokenE
}

export default function SwapBox(props: SwapBoxProps) {
  const [amount, setAmount] = useState<number>(0)

  return (
    <ShadowedBox sx={{ width: '100%', bgcolor: '#f6f7f8', py: { xs: 2, md: 3 }, px: { xs: 2, md: 4 } }}>
      <Typography variant="body1" fontWeight="bold">Swap Trade</Typography>
      <Box component="form" noValidate autoComplete="off" mt={3}>
        <CustomTextField
          required
          id="trade-amount"
          label="Trade Amount"
          type="number"
          value={amount}
          size="medium"
          onChange={(e: any) => setAmount(Number(e.target.value))}
        />
        <Box py={1}>
          <Typography variant="body2" fontWeight="bold">Collateral Required</Typography>
        </Box>
      </Box>
    </ShadowedBox>
  )
}