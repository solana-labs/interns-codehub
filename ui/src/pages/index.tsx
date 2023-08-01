import { Container, Typography } from '@mui/material'
import { Metadata } from 'next'
import Router from 'next/router'
import { useEffect } from 'react'

export const metadata: Metadata = {
  title: 'Clad Finance',
  description: 'Leverage trade any coins oracle-free!',
}

export default function IndexPage() {
  useEffect(() => {
    const { pathname } = Router
    // if (pathname == '/') {
    //   Router.push('/trade')
    // }
  })

  return (
    <Container maxWidth="lg">
      <Typography variant="h4">Clad</Typography>
    </Container>
  )
}
