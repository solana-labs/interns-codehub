import { Container, Typography } from '@mui/material'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Clad Finance',
  description: 'Leverage trade any coins oracle-free!',
}

export default function IndexPage() {
  return (
    <Container maxWidth="lg">
      <Typography variant="h4">Clad</Typography>
    </Container>
  )
}
