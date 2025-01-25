import React from 'react';
import { Box, LinearProgress, Typography, Fade } from '@mui/material';

interface ScanProgressProps {
  progress: number;
  timeRemaining: number;
  speed: number;
}

const ScanningProgress = ({ progress, timeRemaining, speed }: ScanProgressProps) => {
  // Función para formatear el tiempo restante
  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Fade in={true}>
      <Box className="progress-section">
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ 
            height: 8, 
            borderRadius: 4,
            '& .MuiLinearProgress-bar': {
              transition: 'transform 0.5s linear' // Animación más suave
            }
          }} 
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Escaneando red: {progress.toFixed(1)}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Velocidad: {speed.toFixed(2)} IPs/s
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Tiempo restante: {formatTimeRemaining(timeRemaining)}
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
};

export default ScanningProgress;
