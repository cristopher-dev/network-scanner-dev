import React from 'react';
import { Paper, Typography } from '@mui/material';

const AlertsPanel: React.FC = () => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Panel de Alertas</Typography>
      {/* Aquí irían las alertas */}
    </Paper>
  );
};

export default AlertsPanel;
