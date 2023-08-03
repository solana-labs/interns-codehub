import { Box, Container, Stack, Typography } from '@mui/material'
import { ChartCandlestick, StoragePool, UserAdmin } from '@carbon/icons-react/lib'
import dynamic from 'next/dynamic'
import Link from 'next/link'

import NavbarLink from '@/components/NavbarLink'

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

export default function Navbar() {
  return (
    <Box
      position="fixed"
      py={2}
      top={0}
      left={0}
      right={0}
      zIndex={99999}
      className="bg-zinc-900"
      color="#fff"
    >
      <Container maxWidth="lg">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
        >
          <Link className="hidden items-center space-x-2 md:flex" href="/">
            <Typography variant="h5" fontWeight="bold">Clad</Typography>
          </Link>
          <Stack direction="row" alignItems="center" spacing={1}>
            <NavbarLink href="/trade" icon={<ChartCandlestick />}>
              Trade
            </NavbarLink>
            <NavbarLink href="/pools" icon={<StoragePool />}>
              Pools
            </NavbarLink>
            <NavbarLink href="/position" icon={<StoragePool />}>
              Positions
            </NavbarLink>
            <NavbarLink href="/admin" icon={<UserAdmin />}>
              Admin
            </NavbarLink>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <p className="text-white">Connect to DEVNET!</p>
            <WalletMultiButtonDynamic className="bg-transparent" />
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
