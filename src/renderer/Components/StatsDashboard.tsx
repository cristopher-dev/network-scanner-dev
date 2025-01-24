import React from 'react';
import { Box, Card, Typography } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import ComputerIcon from '@mui/icons-material/Computer';
import RouterIcon from '@mui/icons-material/Router';

const StatsDashboard = ({
  stats,
}: {
  stats: { total: number; active: number; inactive: number };
}) => (
  <Box className="stats-dashboard">
    <StatCard
      icon={<WifiIcon color="primary" fontSize="large" />}
      value={stats.total}
      label="Dispositivos Totales"
    />
    <StatCard
      icon={<ComputerIcon color="success" fontSize="large" />}
      value={stats.active}
      label="Dispositivos Activos"
    />
    <StatCard
      icon={<RouterIcon color="error" fontSize="large" />}
      value={stats.inactive}
      label="Dispositivos Inactivos"
    />
  </Box>
);

const StatCard = ({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) => (
  <Card className="stat-card">
    {icon}
    <Typography variant="h4">{value}</Typography>
    <Typography variant="subtitle2">{label}</Typography>
  </Card>
);

export default StatsDashboard;
