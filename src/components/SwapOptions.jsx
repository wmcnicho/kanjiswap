import React from 'react';
import { Box, Grid } from '@mui/material';

function SwapOptions({ onItemClick, handleSuccess, handleFailure, correctItem }) {
  const handleItemClick = (item) => {
    const isValid = validateItem(item);
    if (isValid) {
      handleSuccess(item);
    } else {
      handleFailure();
    }
  };

  const validateItem = (clickedItem) => {
    return clickedItem === correctItem;
  };

  return (
    <Box mt={2} color="primary.contrastText" p={2}>
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Box p={2} onClick={() => handleItemClick("会月")}>会月</Box>
        </Grid>
        <Grid item xs={4}>
          <Box p={2} onClick={() => handleItemClick("今日")}>今日</Box>
        </Grid>
        <Grid item xs={4}>
          <Box p={2} onClick={() => handleItemClick("子二")}>子二</Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SwapOptions;
