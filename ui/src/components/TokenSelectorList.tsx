import { twMerge } from 'tailwind-merge'
import CloseIcon from '@carbon/icons-react/lib/Close'
import { cloneElement } from 'react'
import { TokenE, getTokenLabel, getTokenIcon } from '@/lib/Token'

interface TokenSelectorListProps {
  className?: string
  onClose?(): void
  onSelectToken?(baseToken: TokenE, quoteToken: TokenE): void
  tokenList?: { base: TokenE, quote: TokenE }[]
}

export default function TokenSelectorList(props: TokenSelectorListProps) {
  const { tokenList } = props
  // const stats = useGlobalStore((state) => state.priceStats)

  if (!tokenList) return (<></>)

  return (
    <div
      className='fixed top-0 left-0 right-0 bottom-0 z-20 bg-black/40'
      onClick={props.onClose}
    >
      <div
        className='absolute top-0 bottom-0 left-0 w-[424px] bg-zinc-900 p-4'
        onClick={(e) => e.stopPropagation()}
      >
        <header className='flex items-center justify-between'>
          <div className='text-sm font-medium text-white'>You Pay</div>
          <button onClick={props.onClose}>
            <CloseIcon className='h-6 w-6 fill-white' />
          </button>
        </header>
        <div className='mt-6'>
          {tokenList.map((tokenPair) => {
            const icon = getTokenIcon(tokenPair.base)

            return (
              <button
                key={tokenPair.base}
                className={twMerge(
                  'bg-zinc-900',
                  'gap-x-3',
                  'grid-cols-[40px,1fr,max-content]',
                  'grid',
                  'items-center',
                  'p-2.5',
                  'rounded',
                  'w-full',
                  'hover:bg-zinc-800'
                )}
                onClick={() => {
                  props.onSelectToken?.(tokenPair.base, tokenPair.quote)
                  props.onClose?.()
                }}
              >
                {cloneElement(icon, {
                  className: 'h-10 w-10',
                })}
                <div className='text-left'>
                  <div className='font-semibold text-white'>{tokenPair.base}</div>
                  <div className='text-sm text-zinc-500'>
                    {getTokenLabel(tokenPair.base)}
                  </div>
                </div>
                {/* {!!stats[token]?.currentPrice && (
                  <div className='text-sm text-white'>
                    ${formatNumber(stats[token].currentPrice)}
                  </div>
                )} */}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}