import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Computer as ComputerIcon,
  NetworkPing as NetworkIcon,
} from '@mui/icons-material';

interface DiagnosticResult {
  nmapInstalled: boolean;
  nmapVersion?: string;
  pingTest: boolean;
  systemInfo: {
    platform: string;
    arch: string;
  };
  networkInterfaces: any;
  error?: string;
}

interface SystemDiagnosticsProps {
  open: boolean;
  onClose: () => void;
}

const SystemDiagnostics: React.FC<SystemDiagnosticsProps> = ({ open, onClose }) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [nmapInstructions, setNmapInstructions] = useState<string>('');

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const result = await window.ipc.invoke('run-diagnostics');
      setDiagnostics(result);

      if (!result.nmapInstalled) {
        const instructions = await window.ipc.invoke('get-nmap-instructions');
        setNmapInstructions(instructions);
      }
    } catch (error) {
      console.error('Error ejecutando diagnósticos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      runDiagnostics();
    }
  }, [open]);

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />;
  };

  const getStatusChip = (status: boolean, label: string) => {
    return (
      <Chip
        icon={getStatusIcon(status)}
        label={label}
        color={status ? 'success' : 'error'}
        variant="outlined"
      />
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <ComputerIcon />
          Diagnóstico del Sistema
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Ejecutando diagnósticos...
            </Typography>
          </Box>
        ) : diagnostics ? (
          <Box>
            {diagnostics.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {diagnostics.error}
              </Alert>
            )}

            {!diagnostics.nmapInstalled && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  ⚠️ nmap no está instalado
                </Typography>
                <Typography variant="body2">
                  La aplicación funcionará con capacidades limitadas. Para obtener todas las
                  funcionalidades, instale nmap siguiendo las instrucciones a continuación.
                </Typography>
              </Alert>
            )}

            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Estado de Componentes
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemIcon>{getStatusIcon(diagnostics.nmapInstalled)}</ListItemIcon>
                  <ListItemText
                    primary="nmap"
                    secondary={
                      diagnostics.nmapInstalled
                        ? `Versión: ${diagnostics.nmapVersion}`
                        : 'No instalado - usando scanner básico'
                    }
                  />
                  {getStatusChip(
                    diagnostics.nmapInstalled,
                    diagnostics.nmapInstalled ? 'Disponible' : 'No disponible',
                  )}
                </ListItem>

                <ListItem>
                  <ListItemIcon>{getStatusIcon(diagnostics.pingTest)}</ListItemIcon>
                  <ListItemText
                    primary="Conectividad de Red"
                    secondary="Prueba de ping a 8.8.8.8"
                  />
                  {getStatusChip(
                    diagnostics.pingTest,
                    diagnostics.pingTest ? 'Funcionando' : 'Con problemas',
                  )}
                </ListItem>
              </List>
            </Paper>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">
                  <ComputerIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
                  Información del Sistema
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" component="pre">
                  Plataforma: {diagnostics.systemInfo.platform}
                  {'\n'}
                  Arquitectura: {diagnostics.systemInfo.arch}
                </Typography>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">
                  <NetworkIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
                  Interfaces de Red
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                  {JSON.stringify(diagnostics.networkInterfaces, null, 2)}
                </Typography>
              </AccordionDetails>
            </Accordion>

            {!diagnostics.nmapInstalled && nmapInstructions && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">
                    <WarningIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
                    Instrucciones de Instalación de nmap
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                    {nmapInstructions}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={runDiagnostics} disabled={loading}>
          Ejecutar Diagnósticos
        </Button>
        <Button onClick={onClose} variant="contained">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SystemDiagnostics;
