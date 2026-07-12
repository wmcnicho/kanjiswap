import React, { useState } from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import SwapPassage from './components/SwapPassage';
import passages from './data/passages.json';

function App() {
  const [passageIndex, setPassageIndex] = useState(0);
  const passage = passages[passageIndex];

  return (
    <Box sx={{
      minHeight: "500px"
    }} display={'flex'} flexDirection={'column'} justifyContent={'center'} alignItems={'center'} p={4}>
      <FormControl sx={{ minWidth: '300px', mb: 4 }}>
        <InputLabel id="passage-select-label">Passage</InputLabel>
        <Select
          labelId="passage-select-label"
          label="Passage"
          value={passageIndex}
          onChange={(event) => setPassageIndex(event.target.value)}
        >
          {passages.map((item, index) => (
            <MenuItem key={index} value={index}>
              {index + 1}. {item.section}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <SwapPassage passage={passage} />
    </Box>
  );
}

export default App;
