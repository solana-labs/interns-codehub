import { Box, Button, Container, Stack, Typography } from '@mui/material'
import { getAccount, getAssociatedTokenAddressSync } from '@solana/spl-token'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import BN from 'bn.js'
import { useCallback, useEffect, useState } from 'react'

import { LOCALNET_CONNECTION } from '@/constants'
import testTokens from '@/data/testTokens'
import { airdropTestTokens } from '@/lib/airdropToken'
import Decimal from 'decimal.js'
import { numScaledFromDecimals } from '@/utils'

export default function AirdropPageIndex() {
  const { connection } = process.env.NEXT_PUBLIC_SOLANA_TARGET === 'localnet' ? { connection: LOCALNET_CONNECTION } : useConnection()
  const wallet = useAnchorWallet()

  const [isAirdropping, setIsAirdropping] = useState(false)
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>(Object.keys(testTokens).reduce((acc, key) => ({ ...acc, [key]: 0 }), {}))

  useEffect(() => {
    if (!connection || !wallet) return

    for (const testToken of Object.values(testTokens)) {
      const tokenAccount = getAssociatedTokenAddressSync(
        testToken.mint,
        wallet.publicKey,
      )
      getAccount(connection, tokenAccount)
        .then((tokenAccountInfo) => {
          if (!tokenAccountInfo) return
          const balanceExpo = new Decimal(tokenAccountInfo.amount.toString())
          const balance = parseFloat(numScaledFromDecimals(balanceExpo, testToken.decimals) || '0')
          setTokenBalances((prev) => ({ ...prev, [testToken.symbol]: balance }))
        })
        .catch(console.error)
    }
  }, [connection, wallet])

  const handleAirdropRequest = useCallback(async () => {
    if (!connection || !wallet) return
    setIsAirdropping(true)
    try {
      await airdropTestTokens(connection, wallet)
    } catch (err) {
      console.error(err)
    } finally {
      setIsAirdropping(false)
    }
  }, [connection, wallet])

  return (
    <Container maxWidth="lg">
      <Typography variant="h5" fontWeight="bold">Airdrop Test Tokens</Typography>
      <Stack spacing={2} mt={3}>
        {Object.values(testTokens).map((testToken) => (
          <Box>
            <Typography variant="h6"><b>{testToken.symbol}</b> ({testToken.mint.toString()})</Typography>
            <Typography variant="body1">Balance: {tokenBalances[testToken.symbol]}</Typography>
          </Box>
        ))}
      </Stack>
      <Box mt={3}>
        <Button variant="outlined" onClick={handleAirdropRequest} disabled={isAirdropping}>Request Airdrop</Button>
      </Box>
    </Container>
  )
}