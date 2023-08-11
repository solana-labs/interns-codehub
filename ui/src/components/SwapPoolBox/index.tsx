import { ArrowRight as ArrowRightIcon, ArrowLeft as ArrowLeftIcon } from '@carbon/icons-react'
import { Box, Button, Stack, TextField, Typography, styled } from '@mui/material'
import { Percentage } from '@orca-so/common-sdk'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Token } from '@solflare-wallet/utl-sdk'
import { useCallback, useEffect, useState } from 'react'
import BN from 'bn.js'
import Decimal from 'decimal.js'

import { CLAD_PROGRAM_ID, LOCALNET_CONNECTION } from '@/constants'
import { useCladProgram } from '@/hooks'
import { swapPool } from '@/lib'
import { ExpirableGlobalpoolData } from '@/slices/globalpool'
import { formatNumber, numScaledFromDecimals, numScaledToDecimals } from '@/utils'
import { swapQuoteByInputToken } from '@/utils/swap'

interface SwapPoolBoxProps {
  globalpool: ExpirableGlobalpoolData | undefined
  baseToken: Token
  quoteToken: Token
}

const ExchangeTokenReprButton = styled(Box)(() => ({
  display: 'inline-block',
  padding: 4,
  cursor: 'pointer',
  borderRadius: '50%',
  '&:hover': {
    backgroundColor: '#eee'
  }
}))

export function SwapPoolBox(props: SwapPoolBoxProps) {
  const {
    globalpool,
    baseToken,
    quoteToken
  } = props

  // react-wallet doesn't connect to localnet despite changing the browser wallet RPC,
  // so we manually set it to localnet here (and other places where we use connection)
  const { connection } = process.env.NEXT_PUBLIC_SOLANA_TARGET === 'localnet' ? { connection: LOCALNET_CONNECTION } : useConnection()

  const wallet = useAnchorWallet()
  const program = useCladProgram(connection)

  const [swapInAmount, setSwapInAmount] = useState<number>(100)
  const [swapOutAmount, setSwapOutAmount] = useState<number>(0)
  const [swapFeeAmount, setSwapFeeAmount] = useState<number>(0)
  const [maxSlippage, setMaxSlippage] = useState<Percentage>(new Percentage(new BN(1), new BN(100))) // 1%

  const [swapInToken, setSwapInToken] = useState<Token>(baseToken)
  const [swapOutToken, setSwapOutToken] = useState<Token>(quoteToken)

  const [isExecutingSwap, setIsExecutingSwap] = useState<boolean>(false)

  const handleExchangeTokenRepr = useCallback(() => {
    setSwapInToken(swapOutToken)
    setSwapOutToken(swapInToken)
  }, [swapInToken, swapOutToken])

  const handleExecuteSwap = useCallback(async () => {
    if (!globalpool || !wallet || !program) return

    setIsExecutingSwap(true)

    // scale to token decimals exponent (make sure to use Decimal for precision, then remove decimal places, then convert to BN)
    const swapInputAmount = new BN(swapInAmount.toString())

    try {
      await swapPool({
        swapInputAmount,
        tokenAuthority: wallet.publicKey,
        swapInputMint: new PublicKey(swapInToken.address),
        swapInputMintDecimals: swapInToken.decimals || 9,
        swapOutputMintDecimals: swapOutToken.decimals || 9,
        maxSlippage,
        globalpool,
        program,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setIsExecutingSwap(false)
    }
  }, [globalpool, wallet, program, swapInAmount, swapInToken, swapOutToken, maxSlippage])

  useEffect(() => {
    if (!globalpool || !connection) return

    const swapInputDecimals = swapInToken.decimals || 9
    const swapOutputDecimals = swapOutToken.decimals || 9

    console.log('maxSlippage', maxSlippage.toString())
    console.log(swapInAmount)

    // scale to token decimals exponent (make sure to use Decimal for precision, then remove decimal places, then convert to BN)
    const swapInAmountExpo = new BN(new Decimal(numScaledToDecimals(swapInAmount, swapInputDecimals)).toFixed(0))

    swapQuoteByInputToken(
      new PublicKey(globalpool._pubkey),
      new PublicKey(swapInToken.address),
      swapInAmountExpo,
      maxSlippage,
      connection,
      CLAD_PROGRAM_ID
    ).then((swapQuote) => {
      // scale from token decimals exponent
      const estOutAmount = new Decimal(numScaledFromDecimals(swapQuote.estimatedAmountOut, swapOutputDecimals))
      const estFeeAmount = new Decimal(numScaledFromDecimals(swapQuote.estimatedFeeAmount, swapInputDecimals))

      console.log(estOutAmount.toString(), estFeeAmount.toString())
      setSwapOutAmount(estOutAmount.toNumber())
      setSwapFeeAmount(estFeeAmount.toNumber())
    }).catch(console.error)
  }, [globalpool, connection, swapInToken, swapOutToken, swapInAmount, maxSlippage])

  return (
    <Stack alignItems="stretch" justifyContent="flex-start">
      <Box>
        <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>In ({swapInToken.symbol})</Typography>
        <TextField
          type="number"
          variant="outlined"
          color="secondary"
          label=""
          onChange={(e: any) => setSwapInAmount(parseFloat(e.target.value) || 0)}
          value={swapInAmount}
          inputProps={{ min: 0 }}
          required
          fullWidth
        />
      </Box>
      <Box pt={2} lineHeight={0.5} textAlign="center">
        <ExchangeTokenReprButton onClick={handleExchangeTokenRepr}>
          <ArrowRightIcon size={24} style={{ display: swapInToken === baseToken ? 'block' : 'none' }} />
          <ArrowLeftIcon size={24} style={{ display: swapInToken === quoteToken ? 'block' : 'none' }} />
        </ExchangeTokenReprButton>
      </Box>
      <Box>
        <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Out ({swapOutToken.symbol})</Typography>
        <TextField
          type="number"
          variant="outlined"
          color="secondary"
          label=""
          value={swapOutAmount}
          inputProps={{ min: 0 }}
          fullWidth
          disabled // only support custom swap-in amount for now
        />
      </Box>
      <Stack direction={{ md: 'row' }} alignItems="center" justifyContent="space-between" spacing={1} pt={2}>
        <Box>
          <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Max Slippage</Typography>
          <Typography variant="body1" fontWeight="bold">
            {maxSlippage ? formatNumber(maxSlippage.toString()) : '-'}%
          </Typography>
        </Box>
        <Box textAlign="right">
          <Typography variant="caption" fontWeight="bold" color="#999" pb={1}>Fee</Typography>
          <Typography variant="body1" fontWeight="bold">{formatNumber(swapFeeAmount)} {swapOutToken.symbol}</Typography>
        </Box>
      </Stack>
      <Box pt={2}>
        <Button variant="outlined" onClick={handleExecuteSwap} disabled={isExecutingSwap} fullWidth>Swap</Button>
      </Box>
    </Stack>
  )
}