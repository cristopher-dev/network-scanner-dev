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
  Tooltip,
  Collapse,
  Divider,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  NetworkCheck as NetworkCheckIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { NetworkUtils } from '../../shared/clientUtils';

interface NetworkInfo {
  baseIp: string;
  interface: string;
  address: string;
  netmask: string;
  cidr?: string;
  gateway?: string;
}

interface Config {
  timeout: number;
  batchSize: number;
  ports: number[];
  baseIp: string;
  startRange: number;
  endRange: number;
}

interface NetworkConfigProps {
  config: Config;
  setConfig: React.Dispatch<React.SetStateAction<Config>>;
  availableNetworks: NetworkInfo[];
  onDetectNetwork: () => void;
  onRefreshNetworks: () => void;
  autoDetecting: boolean;
  scanning: boolean;
}

const NetworkConfigComponent: React.FC<NetworkConfigProps> = ({
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

  useEffect(() => {
    setValidation(NetworkUtils.validateScanConfig(config));
  }, [config]);

  const handleConfigChange = (field: string, value: any) =>
    setConfig((prev: any) => ({ ...prev, [field]: value }));

  const handleNetworkSelect = (n: NetworkInfo) =>
    setConfig((p: any) => ({ ...p, baseIp: n.baseIp, startRange: 1, endRange: 254 }));

  const handleCommonConfigSelect = (c: any) => setConfig((p: any) => ({ ...p, baseIp: c.baseIp }));

  const formattedTime = NetworkUtils.formatEstimatedTime(NetworkUtils.estimateScanTime(config));
  const currentNetwork = availableNetworks.find((n) => n.baseIp === config.baseIp);

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
            {availableNetworks.map((n) => {
              const chipLabel = `${n.baseIp}.x (${n.interface})${n.gateway ? ` → ${n.gateway}` : ''}`;
              return (
                <Tooltip
                  key={`${n.interface}-${n.baseIp}`}
                  title={`IP: ${n.address}, Gateway: ${n.gateway || 'No detectado'}, Interfaz: ${n.interface}`}
                >
                  <Chip
                    label={chipLabel}
                    onClick={() => handleNetworkSelect(n)}
                    color={n.baseIp === config.baseIp ? 'primary' : 'default'}
                    variant={n.baseIp === config.baseIp ? 'filled' : 'outlined'}
                    size="small"
                  />
                </Tooltip>
              );
            })}
          </Box>
        </Box>
      )}

      {currentNetwork && (
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
      )}

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Configuraciones comunes:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {NetworkUtils.getCommonNetworkConfigs().map((c) => (
            <Chip
              key={c.baseIp}
              label={c.name}
              onClick={() => handleCommonConfigSelect(c)}
              color={c.baseIp === config.baseIp ? 'primary' : 'default'}
              variant={c.baseIp === config.baseIp ? 'filled' : 'outlined'}
              size="small"
              title={c.description}
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
            onChange={(e) =>
              handleConfigChange('ports', NetworkUtils.parsePortsString(e.target.value))
            }
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

      {validation && (
        <Box sx={{ mt: 2 }}>
          {validation.errors?.length > 0 && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {validation.errors.map((e: string, idx: number) => (
                <Typography key={`error-${idx}`} variant="body2">
                  • {e}
                </Typography>
              ))}
            </Alert>
          )}
          {validation.warnings?.length > 0 && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              {validation.warnings.map((w: string, idx: number) => (
                <Typography key={`warning-${idx}`} variant="body2">
                  • {w}
                </Typography>
              ))}
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
              {currentNetwork?.gateway && (
                <>
                  <br />
                  <strong>Gateway:</strong> {currentNetwork.gateway}
                </>
              )}
            </Typography>
          </Alert>
        </Box>
      )}
    </Paper>
  );
};

export default NetworkConfigComponent;
