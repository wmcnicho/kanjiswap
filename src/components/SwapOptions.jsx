import React from 'react';
import { Box, Grid } from '@mui/material';

function SwapOptions() {
  return (
    <Box mt={2} color="primary.contrastText" p={2}>
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Box bgcolor="primary.main"p={2}>会月</Box>
        </Grid>
        <Grid item xs={4}>
          <Box bgcolor="primary.main"p={2}>今日</Box>
        </Grid>
        <Grid item xs={4}>
          <Box bgcolor="primary.main"p={2}>子二</Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SwapOptions;
