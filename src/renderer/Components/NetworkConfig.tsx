import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
  Tooltip,
  Collapse,
  Divider,
} from '@mui/material';
import {
  NetworkCheck as NetworkCheckIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { NetworkUtils } from '../../shared/networkUtils';

interface NetworkInfo {
  baseIp: string;
  interface: string;
  address: string;
  netmask: string;
  cidr?: string;
  gateway?: string;
}

interface NetworkConfigProps {
  config: {
    baseIp: string;
    startRange: number;
    endRange: number;
    ports: number[];
    timeout: number;
    batchSize: number;
  };
  setConfig: (config: any) => void;
  availableNetworks: NetworkInfo[];
  onDetectNetwork: () => void;
  onRefreshNetworks: () => void;
  autoDetecting: boolean;
  scanning: boolean;
}

const NetworkConfig: React.FC<NetworkConfigProps> = ({
  config,
  setConfig,
  availableNetworks,
  onDetectNetwork,
  onRefreshNetworks,
  autoDetecting,
  scanning,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validation, setValidation] = useState<any>(null);

  // Validar configuración cada vez que cambie
  useEffect(() => {
    const result = NetworkUtils.validateScanConfig(config);
    setValidation(result);
  }, [config]);

  const handleNetworkSelect = (networkInfo: NetworkInfo) => {
    setConfig((prev: any) => ({
      ...prev,
      baseIp: networkInfo.baseIp,
      startRange: 1,
      endRange: 254,
    }));
  };

  const handleConfigChange = (field: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCommonConfigSelect = (commonConfig: any) => {
    setConfig((prev: any) => ({
      ...prev,
      baseIp: commonConfig.baseIp,
    }));
  };

  const estimatedTime = NetworkUtils.estimateScanTime(config);
  const formattedTime = NetworkUtils.formatEstimatedTime(estimatedTime);

  return (
    <Paper sx={{ p: 3, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <SettingsIcon sx={{ mr: 1 }} />
        <Typography variant="h6">Configuración de Red</Typography>
        <Box sx={{ ml: 'auto' }}>
          <Tooltip title="Detectar red automáticamente">
            <IconButton
              onClick={onDetectNetwork}
              disabled={autoDetecting || scanning}
              color="primary"
            >
              {autoDetecting ? <CircularProgress size={20} /> : <NetworkCheckIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Actualizar redes disponibles">
            <IconButton onClick={onRefreshNetworks} disabled={scanning} color="secondary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {availableNetworks.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Redes detectadas:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {availableNetworks.map((network, index) => (
              <Tooltip
                key={index}
                title={`IP: ${network.address}, Gateway: ${network.gateway || 'No detectado'}, Interfaz: ${network.interface}`}
              >
                <Chip
                  label={`${network.baseIp}.x (${network.interface})${network.gateway ? ` → ${network.gateway}` : ''}`}
                  onClick={() => handleNetworkSelect(network)}
                  color={network.baseIp === config.baseIp ? 'primary' : 'default'}
                  variant={network.baseIp === config.baseIp ? 'filled' : 'outlined'}
                  size="small"
                />
              </Tooltip>
            ))}
          </Box>
        </Box>
      )}

      {/* Información detallada de la red actual */}
      {availableNetworks.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {(() => {
            const currentNetwork = availableNetworks.find((n) => n.baseIp === config.baseIp);
            if (currentNetwork) {
              return (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Red Seleccionada: {currentNetwork.interface}
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>IP Local:</strong> {currentNetwork.address}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Máscara:</strong> {currentNetwork.netmask}
                      </Typography>
                    </Grid>
                    {currentNetwork.gateway && (
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Gateway:</strong> {currentNetwork.gateway}
                        </Typography>
                      </Grid>
                    )}
                    {currentNetwork.cidr && (
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>CIDR:</strong> {currentNetwork.cidr}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Alert>
              );
            }
            return null;
          })()}
        </Box>
      )}

      {/* Configuraciones comunes */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Configuraciones comunes:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {NetworkUtils.getCommonNetworkConfigs().map((commonConfig, index) => (
            <Chip
              key={index}
              label={commonConfig.name}
              onClick={() => handleCommonConfigSelect(commonConfig)}
              color={commonConfig.baseIp === config.baseIp ? 'primary' : 'default'}
              variant={commonConfig.baseIp === config.baseIp ? 'filled' : 'outlined'}
              size="small"
              title={commonConfig.description}
            />
          ))}
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="IP Base"
            value={config.baseIp}
            onChange={(e) => handleConfigChange('baseIp', e.target.value)}
            placeholder="192.168.1"
            disabled={scanning}
            helperText="Primeros 3 octetos de la IP"
          />
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextField
            fullWidth
            type="number"
            label="Inicio"
            value={config.startRange}
            onChange={(e) => handleConfigChange('startRange', parseInt(e.target.value) || 1)}
            disabled={scanning}
            inputProps={{ min: 1, max: 254 }}
          />
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextField
            fullWidth
            type="number"
            label="Fin"
            value={config.endRange}
            onChange={(e) => handleConfigChange('endRange', parseInt(e.target.value) || 254)}
            disabled={scanning}
            inputProps={{ min: 1, max: 254 }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Puertos"
            value={config.ports.join(', ')}
            onChange={(e) => {
              const ports = NetworkUtils.parsePortsString(e.target.value);
              handleConfigChange('ports', ports);
            }}
            disabled={scanning}
            helperText="Separados por comas (ej: 22, 80, 443)"
          />
        </Grid>
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowAdvanced(!showAdvanced)}
              startIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              Configuración Avanzada
            </Button>
          </Box>
        </Grid>
      </Grid>

      <Collapse in={showAdvanced}>
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={6} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Timeout (ms)"
                value={config.timeout}
                onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value) || 2000)}
                disabled={scanning}
                inputProps={{ min: 500, max: 10000, step: 100 }}
                helperText="Tiempo límite por conexión"
              />
            </Grid>
            <Grid item xs={6} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Tamaño de Lote"
                value={config.batchSize}
                onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value) || 10)}
                disabled={scanning}
                inputProps={{ min: 1, max: 50 }}
                helperText="IPs escaneadas simultáneamente"
              />
            </Grid>
          </Grid>
        </Box>
      </Collapse>

      {/* Validación y estadísticas */}
      {validation && (
        <Box sx={{ mt: 2 }}>
          {validation.errors.length > 0 && (
            <Alert severity="error" sx={{ mb: 1 }}>
              <Box>
                {validation.errors.map((error: string, index: number) => (
                  <Typography key={index} variant="body2">
                    • {error}
                  </Typography>
                ))}
              </Box>
            </Alert>
          )}

          {validation.warnings.length > 0 && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              <Box>
                {validation.warnings.map((warning: string, index: number) => (
                  <Typography key={index} variant="body2">
                    • {warning}
                  </Typography>
                ))}
              </Box>
            </Alert>
          )}

          <Alert severity="info">
            <Typography variant="body2">
              <strong>Rango a escanear:</strong> {config.baseIp}.{config.startRange} -{' '}
              {config.baseIp}.{config.endRange}
              <br />
              <strong>Total de IPs:</strong> {config.endRange - config.startRange + 1}
              <br />
              <strong>Puertos por IP:</strong> {config.ports.length}
              <br />
              <strong>Tiempo estimado:</strong> {formattedTime}
              {availableNetworks.find((n) => n.baseIp === config.baseIp)?.gateway && (
                <>
                  <br />
                  <strong>Gateway:</strong>{' '}
                  {availableNetworks.find((n) => n.baseIp === config.baseIp)?.gateway}
                </>
              )}
            </Typography>
          </Alert>
        </Box>
      )}
    </Paper>
  );
};

export default NetworkConfig;
