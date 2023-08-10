import CloseIcon from '@carbon/icons-react/lib/Close'
import { Box, Stack, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { Token } from '@solflare-wallet/utl-sdk'
import Image from 'next/image'
import { useRouter } from 'next/router'

import { TransitionsModal } from '@/components/TransitionsModal'

const TokenSelectorContent = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  border: '1px solid #171719',
  borderRadius: 6,
  boxShadow: '0 0 20px 1px rgba(130, 130, 130, 0.13)',
  padding: theme.spacing(3, 4),
  width: '100%',
  maxWidth: 400,
  maxHeight: 500,
  overflow: 'hidden',
}))

const TokenClickStack = styled(Stack)(({ theme }) => ({
  cursor: 'pointer',
  padding: theme.spacing(1, 2),
  transition: 'background-color 0.2s ease-in-out',
  borderRadius: 6,
  '&:hover': {
    backgroundColor: '#eee',
  }
}))

interface TokenSelectorListProps {
  isSelectorOpen: boolean
  setIsSelectorOpen: React.Dispatch<React.SetStateAction<boolean>>
  tokenList: { base: Token, quote: Token }[]
}

export default function TokenSelectorList(props: TokenSelectorListProps) {
  const { isSelectorOpen, setIsSelectorOpen, tokenList } = props

  const router = useRouter()

  if (!tokenList || !tokenList.length) return (<></>)

  return (
    <TransitionsModal isSelectorOpen={isSelectorOpen} setIsSelectorOpen={setIsSelectorOpen}>
      <TokenSelectorContent id="token-selector-content">
        <Box width="100%" overflow={{ y: 'scroll' }}>
          <Typography variant="h6" fontWeight="bold" textAlign="center">Select Tokens</Typography>
          <Stack spacing={1} pt={2}>
            {tokenList.map((tokenPair) => {
              const { base: baseToken, quote: quoteToken } = tokenPair
              return (
                <TokenClickStack
                  key={baseToken.symbol + quoteToken.symbol}
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  onClick={() => {
                    setIsSelectorOpen(false)
                    const newUrl = `/trade/${baseToken.symbol}-${quoteToken.symbol}`
                    if (router.pathname !== newUrl) router.push(newUrl) // push if not already on the page
                  }}
                >
                  <Image src={baseToken.logoURI || '/'} alt={baseToken.symbol} width={40} height={40} />
                  <Typography variant="h6" fontWeight="bold">{baseToken.symbol}/{quoteToken.symbol}</Typography>
                </TokenClickStack>
              )
            })}
          </Stack>
        </Box>
      </TokenSelectorContent>
    </TransitionsModal>
    // <Box // this is overlay
    //   position="fixed"
    //   top={0}
    //   right={0}
    //   bottom={0}
    //   left={0}
    //   zIndex={9999}
    //   bgcolor="#333"
    //   color="#fff"
    //   hidden={isHidden}
    //   onClick={props.onClose}
    // >

    // </Box>
  )
}