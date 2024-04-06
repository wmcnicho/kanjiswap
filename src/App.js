import React from 'react';
import { Box, Typography } from '@mui/material';
import SwapWord from './components/SwapWord';

function App() {
  return (
    <Box sx={{
      minHeight: "500px"
    }} display={'flex'} flexDirection={'column'} justifyContent={'center'} alignItems={'center'}>
      <Box display={'flex'} flexDirection={'row'} justifyContent={'center'} alignItems={'center'}>
        <SwapWord>こんにち</SwapWord>
        <Typography variant='h1'>は</Typography>
      </Box>
    </Box>
  );
}

export default App;
