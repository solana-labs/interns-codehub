import { Box, SxProps} from '@mui/material'
import { PropsWithChildren } from 'react'

export default function ShadowedBox(props: PropsWithChildren & { sx?: SxProps }) {
  return (
    <Box
			py={1.5}
			px={2}
			borderRadius={2}
			border="1px solid #eee"
			boxShadow="0 0 20px 1px rgba(130, 130, 130, 0.15)"
			bgcolor="#f9fafb"
			sx={props.sx}
		>
			{props.children}
		</Box>
  )
}