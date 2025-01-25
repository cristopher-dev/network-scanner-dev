import React from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import { NetworkCheckRounded, DevicesRounded, SpeedRounded } from '@mui/icons-material';

interface NetworkStatsProps {
  metrics?: {
    deviceCount: number;
    bandwidth: number;
    latency: number;
  };
}

const NetworkStats: React.FC<NetworkStatsProps> = ({ metrics }) => {
  return (
    <Box sx={{ flexGrow: 1, mb: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <DevicesRounded sx={{ fontSize: 40, color: 'primary.main' }} />
              <Typography variant="h6">Dispositivos Totales</Typography>
              <Typography variant="h4">{metrics?.deviceCount || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <NetworkCheckRounded sx={{ fontSize: 40, color: 'primary.main' }} />
              <Typography variant="h6">Ancho de Banda</Typography>
              <Typography variant="h4">{metrics?.bandwidth?.toFixed(2) || 0} Mbps</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SpeedRounded sx={{ fontSize: 40, color: 'primary.main' }} />
              <Typography variant="h6">Latencia</Typography>
              <Typography variant="h4">{metrics?.latency?.toFixed(2) || 0} ms</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default NetworkStats;
