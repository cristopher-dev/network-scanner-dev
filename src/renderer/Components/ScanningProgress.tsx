import React from 'react';
import { Box, LinearProgress, Typography, Fade } from '@mui/material';

const ScanningProgress = ({ progress }: { progress: number }) => (
  <Fade in={true}>
    <Box className="progress-section">
      <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
      <Typography variant="caption" color="text.secondary">
        Escaneando red: {progress}%
      </Typography>
    </Box>
  </Fade>
);

export default ScanningProgress;
