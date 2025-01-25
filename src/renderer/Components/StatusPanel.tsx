import React from 'react';
import { Box, Typography, Grid, Chip } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import TimerIcon from '@mui/icons-material/Timer';

interface ScanStats {
  speed: number;
  estimatedTimeRemaining: number;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

const StatusPanel = ({ scanStats }: { scanStats: ScanStats }) => {
  return (
    <Box className="status-panel">
      <Typography variant="h6">Estado del Escaneo</Typography>
      <Grid container spacing={2}>
        <Grid item>
          <Chip icon={<SpeedIcon />} label={`Velocidad: ${scanStats.speed.toFixed(2)} IPs/s`} />
        </Grid>
        <Grid item>
          <Chip
            icon={<TimerIcon />}
            label={`Tiempo restante: ${formatTime(scanStats.estimatedTimeRemaining)}`}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default StatusPanel;
