import React, { useEffect, useState } from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import NetworkTopology from './NetworkTopology';
import RealTimeMetrics from './RealTimeMetrics';
import NetworkStats from './NetworkStats';

const fetchNetworkMetrics = async (): Promise<NetworkMetrics> => {
  // Implementar la lógica real para obtener métricas
  return {
    timestamp: Date.now(),
    deviceCount: Math.floor(Math.random() * 100),
    bandwidth: Math.random() * 1000,
    latency: Math.random() * 100,
  };
};

interface NetworkStatsProps {
  metrics: NetworkMetrics | undefined;
}

interface NetworkMetrics {
  timestamp: number;
  deviceCount: number;
  bandwidth: number;
  latency: number;
}

const NetworkDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<NetworkMetrics[]>([]);

  useEffect(() => {
    const updateInterval = setInterval(() => {
      // Actualizar métricas cada 5 segundos
      fetchNetworkMetrics().then((newMetrics: NetworkMetrics) => {
        setMetrics((prev) => [...prev.slice(-20), newMetrics]);
      });
    }, 5000);

    return () => clearInterval(updateInterval);
  }, []);

  return (
    <Box className="dashboard-container">
      <NetworkTopology />
      <RealTimeMetrics />
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper className="chart-container">
            <LineChart width={600} height={300} data={metrics}>
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="deviceCount" stroke="#8884d8" />
              <Line type="monotone" dataKey="bandwidth" stroke="#82ca9d" />
            </LineChart>
            <NetworkStats metrics={metrics[metrics.length - 1]} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <NetworkStats metrics={metrics[metrics.length - 1]} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default NetworkDashboard;
