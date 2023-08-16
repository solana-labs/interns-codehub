import { Typography } from '@mui/material'
import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Clad Finance',
	description: 'Leverage trade any coins oracle-free!',
}

export default function AboutPage() {
	return (<>
		<Typography variant="h1">About</Typography>
	</>)
}
