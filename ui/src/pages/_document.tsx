import { ServerStyleSheets } from '@mui/styles'
import React from 'react'
import { Metadata } from 'next'
import Document, { Html, Head, Main } from 'next/document'

export const metadata: Metadata = {
  title: 'Clad Finance',
  description: 'Leverage trade any coins oracle-free!',
}

export default function MyDocument() {
  return (
    <Html lang="en">
      <Head>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="follow, index" />
        <meta name="description" content={metadata.description || ''} />
        {/* PWA primary color */}
        {/* <meta name='theme-color' content={theme.palette.primary.main} /> */}
      </Head>
      <body>
        <Main />
      </body>
    </Html>
  )
}

// `getInitialProps` belongs to `_document` (instead of `_app`),
MyDocument.getInitialProps = async (ctx: any) => {
  const sheets = new ServerStyleSheets()
  const originalRenderPage = ctx.renderPage

  ctx.renderPage = () =>
    originalRenderPage({
      enhanceApp: (App: any) => (props: any) =>
        sheets.collect(<App {...props} />),
    })

  const initialProps = await Document.getInitialProps(ctx)

  return {
    ...initialProps,
    // Styles fragment is rendered after the app and page rendering finish.
    styles: [
      ...React.Children.toArray(initialProps.styles),
      sheets.getStyleElement(),
    ],
  }
}