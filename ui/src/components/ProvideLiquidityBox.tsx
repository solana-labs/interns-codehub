import { Box, SxProps } from '@mui/material'

import { ShadowedBox } from '@/components/ShadowedBox'

interface ProvideLiquidityBoxProps {
  sx?: SxProps
}

export function ProvideLiquidityBox(props: ProvideLiquidityBoxProps) {
  return (
    <Box width="100%" sx={props.sx}>
      <ShadowedBox><p>ProvideLiquidityBox</p></ShadowedBox>
    </Box>
  )
}