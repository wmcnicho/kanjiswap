import React from 'react';
import { Box, Grid } from '@mui/material';

function SwapOptions({ handleSuccess, handleFailure, correctItem, options }) {
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
    <Box color="primary.contrastText" p={1}>
      <Grid container spacing={2}>
        {options.map((option) => (
          <Grid item xs={4} key={option}>
            <Box p={1} sx={{ cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => handleItemClick(option)}>
              {option}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default SwapOptions;
