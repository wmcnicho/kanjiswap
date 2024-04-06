import React from 'react';
import { Tooltip, Typography } from '@mui/material';
import SwapOptions from './SwapOptions';

function SwapWord({ children }) {
  const correctItem = "今日"; 

  const handleSuccess = (clickedItem) => {
    const swapWordElement = document.getElementById('swap-word');
    if (swapWordElement) {
      swapWordElement.style.color = 'green'; // Change text color to green
      setTimeout(() => {
        swapWordElement.innerText = clickedItem; // Replace text with clicked item
        swapWordElement.style.color = 'black'; // Change text color back to black
      }, 500); // Adjust duration as needed
    }
  };

  const handleFailure = () => {
    const swapWordElement = document.getElementById('swap-word');
    if (swapWordElement) {
      swapWordElement.style.color = 'red'; // Change text color to red
      setTimeout(() => {
        swapWordElement.style.color = 'black'; // Change text color back to black
      }, 500); // Adjust duration as needed
    }
  };

  return (
    <Tooltip
      title={<SwapOptions handleSuccess={handleSuccess} handleFailure={handleFailure} correctItem={correctItem} />}
      PopperProps={{
        disablePortal: true,
        style: { position: 'relative' },
      }}
      placement="bottom"
      arrow
      interactive
    >
      <Typography id="swap-word" variant='h1'>{children}</Typography>
    </Tooltip>
  );
}

export default SwapWord;
