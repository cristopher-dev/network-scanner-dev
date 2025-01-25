import React from 'react';
import { Box, Card, Typography, CardHeader, CardContent } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import ComputerIcon from '@mui/icons-material/Computer';
import RouterIcon from '@mui/icons-material/Router';
import { PieChart, Pie, Tooltip, Legend } from 'recharts';

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

interface ScanResult {
  // Define las propiedades necesarias para tu resultado de escaneo
  ip?: string;
  status?: string;
  // Añade más propiedades según necesites
}

const NetworkGraph = ({ scanResults }: { scanResults: ScanResult[] }) => {
  const processData = (results: ScanResult[]) => {
    const statusCount = results.reduce(
      (acc, curr) => {
        const status = curr.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(statusCount).map(([name, value]) => ({
      name,
      value,
    }));
  };

  return (
    <Card className="network-graph">
      <CardHeader title="Distribución de Red" />
      <CardContent>
        <Box sx={{ height: 300 }}>
          <PieChart>
            <Pie
              data={processData(scanResults)}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
            />
            <Tooltip />
            <Legend />
          </PieChart>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatsDashboard;
