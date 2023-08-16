import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'

export const ShadowedBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  border: '1px solid #eee',
  borderRadius: 10,
  boxShadow: '0 0 10px 0 rgba(130, 130, 130, 0.1)',
  backgroundColor: '#f9fafb',
}))
