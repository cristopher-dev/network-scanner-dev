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
  LinearProgress,
  SelectChangeEvent,
  Button,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import Header from './Header';
import StatsDashboard from './StatsDashboard';
import ResultsGrid from './ResultsGrid';
import ConfigDrawer from './ConfigDrawer';
import FilterMenu from './FilterMenu';
import SystemDiagnostics from './SystemDiagnostics';
import NetworkConfig from './NetworkConfig';
import './Home.css';

interface ScanConfig {
  timeout: number;
  batchSize: number;
  ports: number[];
  baseIp: string;
  startRange: number;
  endRange: number;
}

interface ScanResult {
  ip: string;
  status: 'up' | 'down';
  ports?: number[]; // Cambiado de array de objetos a array de números
}

const Home: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ScanConfig>({
    timeout: 2000,
    batchSize: 10,
    ports: [20, 21, 22, 23, 25, 53, 80, 443, 445, 3389, 8080],
    baseIp: '192.168.1', // Valor por defecto más común
    startRange: 1,
    endRange: 254,
  });
  const [availableNetworks, setAvailableNetworks] = useState<any[]>([]);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    orderBy: 'ip',
  });

  const handleFilterChange = (event: SelectChangeEvent) => {
    setFilters((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

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
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: darkMode ? '0 8px 16px rgba(0,0,0,0.3)' : '0 8px 16px rgba(0,0,0,0.1)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            textTransform: 'none',
            fontWeight: 600,
          },
        },
      },
      MuiSnackbar: {
        styleOverrides: {
          root: {
            bottom: '24px',
          },
        },
      },
    },
  });

  const updateStats = useCallback((results: ScanResult[]) => {
    const active = results.filter((r) => r.status === 'up').length;
    setStats({
      total: results.length,
      active,
      inactive: results.length - active,
    });
  }, []);

  const loadAvailableNetworks = useCallback(async () => {
    try {
      const networks = await window.ipc.invoke('get-available-networks');
      setAvailableNetworks(networks || []);
    } catch (error) {
      console.error('Error cargando redes disponibles:', error);
    }
  }, []);

  const detectCurrentNetwork = useCallback(async () => {
    setAutoDetecting(true);
    try {
      const networkInfo = await window.ipc.invoke('detect-current-network');
      if (networkInfo) {
        setConfig((prev) => ({
          ...prev,
          baseIp: networkInfo.baseIp,
          startRange: networkInfo.startRange,
          endRange: networkInfo.endRange,
        }));
        setError(null);
        console.log(
          `Red detectada automáticamente: ${networkInfo.baseIp}.x en ${networkInfo.interface}`,
        );
      } else {
        setError('No se pudo detectar automáticamente la red. Configure manualmente.');
      }
    } catch (error) {
      console.error('Error detectando red:', error);
      setError('Error al detectar la red automáticamente');
    } finally {
      setAutoDetecting(false);
    }
  }, []);

  // Cargar configuración inicial y detectar red al montar el componente
  React.useEffect(() => {
    const initializeConfig = async () => {
      try {
        // Cargar configuración guardada usando el método directo
        const savedConfig = window.ipc.get('scanConfig');
        if (savedConfig) {
          setConfig((prevConfig) => ({ ...prevConfig, ...savedConfig }));
        } else {
          // Si no hay configuración guardada, detectar automáticamente
          await detectCurrentNetwork();
        }

        // Cargar redes disponibles
        await loadAvailableNetworks();
      } catch (error) {
        console.error('Error inicializando configuración:', error);
      }
    };

    initializeConfig();
  }, [detectCurrentNetwork, loadAvailableNetworks]);

  const handleScan = async () => {
    try {
      // Validar configuración antes de escanear
      if (!config.baseIp) {
        setError('Por favor ingrese una IP base válida');
        return;
      }

      setScanning(true);
      setProgress(0);
      setScanResults([]);

      const scanConfig = {
        baseIp: config.baseIp,
        startRange: config.startRange,
        endRange: config.endRange,
        ports: config.ports,
        timeout: config.timeout,
        batchSize: config.batchSize,
      };

      console.log('Iniciando escaneo con configuración:', scanConfig);

      // Manejar el progreso del escaneo
      const removeListener = window.ipc.on('scan-progress', (progress: number) => {
        setProgress(Math.min(progress, 100));
      });

      try {
        // Invocar el escaneo a través de IPC
        const results = await window.ipc.invoke('scan-network', scanConfig);

        if (Array.isArray(results)) {
          // Convertir el formato de puertos si es necesario
          const transformedResults = results.map((result) => ({
            ...result,
            ports: Array.isArray(result.ports) ? result.ports : [],
          }));
          setScanResults(transformedResults);
          updateStats(transformedResults);
          setError(null);

          // Mostrar información sobre el tipo de scanner usado
          if (transformedResults.length > 0 && !transformedResults[0].services) {
            setError(
              'Escaneo completado con scanner básico (nmap no disponible). Para funcionalidades avanzadas, instale nmap.',
            );
          }

          // Guardar resultados en el almacenamiento local
          await window.store.saveNetworkData({
            results: transformedResults,
            config,
            timestamp: new Date().toISOString(),
          });
        } else {
          throw new Error('Formato de resultados inválido');
        }
      } finally {
        if (typeof removeListener === 'function') {
          removeListener(); // Limpiar el listener
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

      // Verificar si el error está relacionado con nmap
      if (errorMessage.includes('nmap') || errorMessage.includes('ENOENT')) {
        setError(
          `Error: nmap no está instalado. La aplicación usará el scanner básico. ${errorMessage}`,
        );
      } else {
        setError(`Error al escanear la red: ${errorMessage}`);
      }

      console.error('Error durante el escaneo:', error);
    } finally {
      setScanning(false);
      setProgress(100);
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
          {scanning && (
            <Box
              sx={{
                width: '100%',
                mb: 2,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <LinearProgress
                variant={progress === 0 ? 'indeterminate' : 'determinate'}
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  '& .MuiLinearProgress-bar': {
                    backgroundImage:
                      'linear-gradient(45deg, rgba(59, 130, 246, 0.8) 30%, rgba(244, 114, 182, 0.8) 90%)',
                    transition: 'transform 0.4s linear',
                  },
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.08)',
                }}
              />
            </Box>
          )}
          <NetworkConfig
            config={config}
            setConfig={setConfig}
            availableNetworks={availableNetworks}
            onDetectNetwork={detectCurrentNetwork}
            onRefreshNetworks={loadAvailableNetworks}
            autoDetecting={autoDetecting}
            scanning={scanning}
          />
          <FilterMenu filters={filters} onFilterChange={handleFilterChange} />
          <StatsDashboard stats={stats} />
          {scanResults.length === 0 && !scanning && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 8,
                textAlign: 'center',
              }}
            >
              <Card
                sx={{
                  maxWidth: 400,
                  p: 4,
                  background:
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(244, 114, 182, 0.1) 100%)'
                      : 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(244, 114, 182, 0.05) 100%)',
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}`,
                  borderRadius: 3,
                }}
              >
                <CardContent>
                  <NetworkCheckIcon
                    sx={{
                      fontSize: 64,
                      color: 'primary.main',
                      mb: 2,
                      opacity: 0.8,
                    }}
                  />
                  <Typography variant="h5" gutterBottom fontWeight="bold">
                    Descubre tu Red
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Escanea tu red para encontrar dispositivos conectados, puertos abiertos y
                    servicios activos.
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleScan}
                    startIcon={<PlayArrowIcon />}
                    sx={{
                      borderRadius: 2,
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      background: 'linear-gradient(45deg, #3b82f6 30%, #2563eb 90%)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #2563eb 30%, #1d4ed8 90%)',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Iniciar Escaneo
                  </Button>
                </CardContent>
              </Card>
            </Box>
          )}
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
          <SpeedDialAction
            icon={<SecurityIcon />}
            tooltipTitle="Diagnósticos del Sistema"
            onClick={() => setDiagnosticsOpen(true)}
          />
        </SpeedDial>
        <ConfigDrawer
          drawerOpen={drawerOpen}
          setDrawerOpen={setDrawerOpen}
          config={config}
          setConfig={setConfig}
        />
        <SystemDiagnostics open={diagnosticsOpen} onClose={() => setDiagnosticsOpen(false)} />
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
