import React, { useState, useCallback } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Paper,
  Box,
  Snackbar,
  Alert,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import Header from './Header';
import ScanningProgress from './ScanningProgress';
import StatsDashboard from './StatsDashboard';
import ResultsGrid from './ResultsGrid';
import ConfigDrawer from './ConfigDrawer';
import FilterMenu from './FilterMenu';
import './Home.css';

interface ScanConfig {
  timeout: number;
  batchSize: number;
  ports: number[];
  baseIp: string;
  startRange: number;
  endRange: number;
}

const Home: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ScanConfig>({
    timeout: 2000,
    batchSize: 10,
    ports: [20, 21, 22, 23, 25, 53, 80, 443, 445, 3389, 8080],
    baseIp: '192.168.10',
    startRange: 1,
    endRange: 254,
  });

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#2563eb',
      },
      secondary: {
        main: '#f472b6',
        light: '#f9a8d4',
        dark: '#db2777',
      },
      background: {
        default: darkMode ? '#0f172a' : '#f8fafc',
        paper: darkMode ? '#1e293b' : '#ffffff',
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            transition: 'all 0.2s ease',
          },
        },
      },
    },
  });

  const updateStats = useCallback((results: any[]) => {
    const active = results.filter((r) => r.status === 'up').length;
    setStats({
      total: results.length,
      active,
      inactive: results.length - active,
    });
  }, []);

  const handleScan = async () => {
    try {
      setScanning(true);
      setProgress(0);
      setScanResults([]);

      const results = (await window.ipc.invoke(
        'scan-network',
        config.baseIp,
        config.startRange,
        config.endRange,
        config.ports,
        config.timeout,
        config.batchSize,
      )) as any[];

      setScanResults(results);
      updateStats(results);
    } catch (error) {
      setError('Error al escanear la red');
      console.error('Error:', error);
    } finally {
      setScanning(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" className="scanner-container">
        <Paper elevation={0} className="main-content">
          <Header
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleScan={handleScan}
            scanning={scanning}
          />
          {scanning && <ScanningProgress progress={progress} />}
          <FilterMenu />
          <StatsDashboard stats={stats} />
          <ResultsGrid scanResults={scanResults} />
        </Paper>
        <SpeedDial
          ariaLabel="Scanner Actions"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
          onClose={() => {}}
          onOpen={() => {}}
        >
          <SpeedDialAction
            icon={<SettingsIcon />}
            tooltipTitle="Configuración"
            onClick={() => setDrawerOpen(true)}
          />
          <SpeedDialAction icon={<SecurityIcon />} tooltipTitle="Seguridad" onClick={() => {}} />
        </SpeedDial>
        <ConfigDrawer
          drawerOpen={drawerOpen}
          setDrawerOpen={setDrawerOpen}
          config={config}
          setConfig={setConfig}
        />
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
};

export default Home;
