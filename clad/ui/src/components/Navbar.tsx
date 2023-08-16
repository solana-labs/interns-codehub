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
      bgcolor="#eee"
      borderBottom="1px solid #ddd"
      boxShadow="0 0 10px 0 rgba(130,130,130,0.13)"
    >
      <Container maxWidth="lg">
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
        >
          <Link className="hidden items-center space-x-2 md:flex" href="/">
            <Typography variant="h5" fontWeight="bold">CLAD</Typography>
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
            <NavbarLink href="/airdrop" icon={<UserAdmin />}>
              Airdrop
            </NavbarLink>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="body2">Connect to DEVNET!</Typography>
            <Box bgcolor="#333" borderRadius={1}>
              <WalletMultiButtonDynamic style={{ margin: 0 }} />
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  )
}
