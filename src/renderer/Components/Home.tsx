import React, { useState, useCallback } from 'react';
import {
  LinearProgress,
  TextField,
  Card,
  Grid,
  Typography,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
  Box,
  Paper,
  Fade,
  Container,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Drawer,
  Slider,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Alert,
  Snackbar,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
  Tooltip,
  Zoom,
  Grow,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import WifiIcon from '@mui/icons-material/Wifi';
import ComputerIcon from '@mui/icons-material/Computer';
import RouterIcon from '@mui/icons-material/Router';
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

  const ConfigDrawer = () => (
    <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
      <Box sx={{ width: 350, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Configuración Avanzada
        </Typography>
        <List>
          <ConfigSlider
            label="Timeout (ms)"
            value={config.timeout}
            onChange={(value) => setConfig({ ...config, timeout: value })}
            min={500}
            max={5000}
            step={100}
          />
          <ConfigSlider
            label="Tamaño de Lote"
            value={config.batchSize}
            onChange={(value) => setConfig({ ...config, batchSize: value })}
            min={5}
            max={50}
            step={5}
          />
          <ConfigRange
            label="Rango IP"
            startValue={config.startRange}
            endValue={config.endRange}
            onStartChange={(value) => setConfig({ ...config, startRange: value })}
            onEndChange={(value) => setConfig({ ...config, endRange: value })}
          />
        </List>
      </Box>
    </Drawer>
  );

  const FilterMenu = () => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Filtrar por:
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Chip label="Todos" onClick={() => {}} color="primary" variant="outlined" />
        <Chip label="Activos" onClick={() => {}} color="success" variant="outlined" />
        <Chip label="Inactivos" onClick={() => {}} color="error" variant="outlined" />
      </Box>
    </Box>
  );

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
        <ConfigDrawer />
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
};

const ConfigSlider = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}) => (
  <ListItem>
    <Box sx={{ width: '100%' }}>
      <Typography variant="body1">{label}</Typography>
      <Box sx={{ mt: 1 }}>
        <Slider
          value={value}
          onChange={(_, value) => onChange(value as number)}
          min={min}
          max={max}
          step={step}
        />
      </Box>
    </Box>
  </ListItem>
);

const ConfigRange = ({
  label,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
}: {
  label: string;
  startValue: number;
  endValue: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
}) => (
  <ListItem>
    <Box>
      <Typography variant="body1">{label}</Typography>
      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        <TextField
          size="small"
          label="Inicio"
          type="number"
          value={startValue}
          onChange={(e) => onStartChange(Number(e.target.value))}
        />
        <TextField
          size="small"
          label="Fin"
          type="number"
          value={endValue}
          onChange={(e) => onEndChange(Number(e.target.value))}
        />
      </Box>
    </Box>
  </ListItem>
);

const Header = ({
  darkMode,
  setDarkMode,
  searchTerm,
  setSearchTerm,
  handleScan,
  scanning,
}: {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  handleScan: () => void;
  scanning: boolean;
}) => (
  <Box className="header-container">
    <Box className="title-section">
      <Typography variant="h3" className="title" fontWeight="bold">
        Network Scanner
      </Typography>
      <Typography variant="subtitle1" color="text.secondary">
        Monitoreo y análisis de red en tiempo real
      </Typography>
    </Box>
    <Box className="controls">
      <FormControlLabel
        control={
          <Switch
            checked={darkMode}
            onChange={() => setDarkMode(!darkMode)}
            icon={<LightModeIcon />}
            checkedIcon={<DarkModeIcon />}
          />
        }
        label=""
      />
      <TextField
        variant="outlined"
        size="small"
        placeholder="Buscar dispositivos..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon />,
        }}
        className="search-field"
      />
      <IconButton onClick={handleScan} disabled={scanning} color="primary" className="scan-button">
        <RefreshIcon />
      </IconButton>
    </Box>
  </Box>
);

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

const ResultsGrid = ({ scanResults }: { scanResults: any[] }) => (
  <Grid container spacing={3} className="results-grid">
    {scanResults.map((result, index: number) => (
      <Grow
        in={true}
        style={{ transformOrigin: '0 0 0' }}
        timeout={300 + index * 100}
        key={result.ip}
      >
        <Grid item xs={12} sm={6} md={4}>
          <Tooltip title="Click para más detalles" arrow>
            <Card className="device-card">
              <Box className="card-header">
                <Typography variant="h6">{result.ip}</Typography>
                <Chip
                  size="small"
                  label={result.status === 'up' ? 'Activo' : 'Inactivo'}
                  color={result.status === 'up' ? 'success' : 'error'}
                />
              </Box>
              <Box className="card-content">
                {result.hostname && (
                  <Typography variant="body2">Hostname: {result.hostname}</Typography>
                )}
                {result.os && (
                  <Typography variant="body2" className="os-info">
                    SO: {result.os}
                  </Typography>
                )}
                {result.ports && (
                  <Box className="ports-section">
                    <Typography variant="body2">Puertos:</Typography>
                    <Box className="ports-container">
                      {result.ports.map((port: number) => (
                        <Chip
                          key={port}
                          label={port}
                          size="small"
                          variant="outlined"
                          className="port-chip"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Card>
          </Tooltip>
        </Grid>
      </Grow>
    ))}
  </Grid>
);

export default Home;
