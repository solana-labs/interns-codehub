import { Box } from '@mui/material'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

export function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  if (value !== index) return (<></>)

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      <Box sx={{ p: 3, mt: 1 }}>
        {children}
      </Box>
    </div>
  )
}