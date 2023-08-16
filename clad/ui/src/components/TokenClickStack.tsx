import { Stack } from '@mui/material'
import { styled } from '@mui/material/styles'

export const TokenClickStack = styled(Stack)(({ theme }) => ({
  cursor: 'pointer',
  padding: theme.spacing(1, 2),
  transition: 'background-color 0.2s ease-in-out',
  borderRadius: 6,
  '&:hover': {
    backgroundColor: '#eee',
  }
}))