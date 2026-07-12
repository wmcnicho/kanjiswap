import React, { useState } from 'react';
import { Tooltip, Typography } from '@mui/material';
import SwapOptions from './SwapOptions';

function SwapWord({ reading, correctItem, options, variant = 'h5' }) {
  const [swappedItem, setSwappedItem] = useState(null);
  const [flash, setFlash] = useState(null); // 'success' | 'failure' | null

  const handleSuccess = (clickedItem) => {
    setFlash('success'); // Change text color to green
    setTimeout(() => {
      setSwappedItem(clickedItem); // Replace text with clicked item
      setFlash(null); // Change text color back to black
    }, 500); // Adjust duration as needed
  };

  const handleFailure = () => {
    setFlash('failure'); // Change text color to red
    setTimeout(() => {
      setFlash(null); // Change text color back to black
    }, 500); // Adjust duration as needed
  };

  const color = flash === 'success' ? 'green' : flash === 'failure' ? 'red' : 'inherit';

  const word = (
    <Typography
      component='span'
      variant={variant}
      sx={{
        color,
        cursor: swappedItem ? 'inherit' : 'pointer',
        borderBottom: swappedItem ? 'none' : '2px dotted', // Mark words still waiting for their kanji
      }}
    >
      {swappedItem ?? reading}
    </Typography>
  );

  if (swappedItem) {
    return word; // Solved words no longer offer options
  }

  return (
    <Tooltip
      title={<SwapOptions handleSuccess={handleSuccess} handleFailure={handleFailure} correctItem={correctItem} options={options} />}
      placement="bottom"
      arrow
    >
      {word}
    </Tooltip>
  );
}

export default SwapWord;
