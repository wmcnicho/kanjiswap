import React, { useState } from 'react';
import { Tooltip, Typography } from '@mui/material';
import SwapOptions from './SwapOptions';

function SwapWord({ children }) {
  const [isBoxVisible, setIsBoxVisible] = useState(false);

  const handleSwapWordClick = () => {
    setIsBoxVisible(!isBoxVisible);
  };

  return (
    <Tooltip
      open={isBoxVisible}
      onClose={() => setIsBoxVisible(false)}
      disableFocusListener
      disableHoverListener
      disableTouchListener
      title={<SwapOptions />}
      PopperProps={{
        disablePortal: true, // Render tooltip within the app component
        style: { position: 'relative' }, // Ensure tooltip has relative positioning
      }}
      placement="bottom"
      arrow
      interactive
    >
      <Typography variant='h1' onClick={handleSwapWordClick}>{children}</Typography>
    </Tooltip>
  );
}

export default SwapWord;
