import ChevronDownIcon from '@carbon/icons-react/lib/ChevronDown'
import { useRouter } from 'next/router'
import { cloneElement, useMemo, useState } from 'react'
import { twMerge } from 'tailwind-merge'

import TokenSelectorList from '@/components/TokenSelectorList'
import { TokenE, getTokenIcon, getTokenLabel } from '@/lib/Token'

interface ChartCurrencyProps {
  className?: string
  baseToken?: TokenE
  quoteToken?: TokenE
}

export default function ChartCurrency(props: ChartCurrencyProps) {
  const { baseToken } = props

  const tokenIcon = useMemo(() => {
    if (!baseToken) return undefined
    return getTokenIcon(baseToken)
  }, [baseToken])

  const [selectorOpen, setSelectorOpen] = useState(false)
  const router = useRouter()

  if (!baseToken || !tokenIcon) return (<></>)

  return (
    <>
      <button
        className={twMerge(
          'flex',
          'group',
          'items-center',
          'space-x-2',
          props.className
        )}
        onClick={() => setSelectorOpen((cur) => !cur)}
      >
        {cloneElement(tokenIcon, {
          className: twMerge(tokenIcon.props.className, 'h-8', 'w-8'),
        })}
        <div className='flex items-baseline space-x-2'>
          <div className='text-3xl font-bold'>{baseToken}</div>
          <div className='text-sm font-medium text-zinc-500'>
            {getTokenLabel(baseToken)}
          </div>
        </div>
        <div className='pl-4'>
          <div
            className={twMerge(
              'border-zinc-700',
              'border',
              'grid',
              'h-6',
              'place-items-center',
              'rounded-full',
              'transition-colors',
              'w-6',
              'group-hover:border-blue'
            )}
          >
            <ChevronDownIcon className='h-4 w-4 fill-black' />
          </div>
        </div>
      </button>
      {selectorOpen && (
        <TokenSelectorList
          onClose={() => setSelectorOpen(false)}
          onSelectToken={(baseToken, quoteToken) => {
            router.push(`/trade/${baseToken}-${quoteToken}`)
          }}
        />
      )}
    </>
  )
}