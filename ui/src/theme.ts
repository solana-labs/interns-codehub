import { createTheme, ThemeOptions } from '@mui/material/styles'

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#3f51b5',
    },
    // secondary: {
    //   main: '#f50057',
    // },
  },
}

const customTheme = createTheme(themeOptions)

export default customTheme