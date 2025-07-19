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
  npmLibrariesAvailable: boolean;
  libraryVersions?: string[];
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
        const instructions = await window.ipc.invoke('get-setup-instructions');
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

  const getSuccessIcon = () => <CheckCircleIcon color="success" />;
  const getErrorIcon = () => <ErrorIcon color="error" />;

  const getStatusChip = (status: boolean, label: string) => {
    return (
      <Chip
        icon={status ? getSuccessIcon() : getErrorIcon()}
        label={label}
        color={status ? 'success' : 'error'}
        variant="outlined"
      />
    );
  };

  let content: React.ReactNode = null;
  if (loading) {
    content = (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Ejecutando diagnósticos...
        </Typography>
      </Box>
    );
  } else if (diagnostics) {
    content = (
      <Box>
        {diagnostics.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {diagnostics.error}
          </Alert>
        )}

        {!diagnostics.npmLibrariesAvailable && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              ⚠️ Algunas librerías NPM no están disponibles
            </Typography>
            <Typography variant="body2">
              La aplicación funcionará con capacidades limitadas. Verifica la instalación de las
              dependencias siguiendo las instrucciones a continuación.
            </Typography>
          </Alert>
        )}

        <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Estado de Componentes
          </Typography>

          <List dense>
            <ListItem>
              <ListItemIcon>
                {diagnostics.npmLibrariesAvailable ? getSuccessIcon() : getErrorIcon()}
              </ListItemIcon>
              <ListItemText
                primary="Librerías NPM"
                secondary={
                  diagnostics.npmLibrariesAvailable
                    ? `Disponibles: ${diagnostics.libraryVersions?.join(', ')}`
                    : 'Algunas librerías no están disponibles'
                }
              />
              {getStatusChip(
                diagnostics.npmLibrariesAvailable,
                diagnostics.npmLibrariesAvailable ? 'Disponible' : 'No disponible',
              )}
            </ListItem>

            <ListItem>
              <ListItemIcon>
                {diagnostics.pingTest ? getSuccessIcon() : getErrorIcon()}
              </ListItemIcon>
              <ListItemText primary="Conectividad de Red" secondary="Prueba de ping a 8.8.8.8" />
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

        {!diagnostics.npmLibrariesAvailable && nmapInstructions && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">
                <WarningIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Instrucciones de Configuración
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
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <ComputerIcon />
          Diagnóstico del Sistema
        </Box>
      </DialogTitle>
      <DialogContent>{content}</DialogContent>
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
