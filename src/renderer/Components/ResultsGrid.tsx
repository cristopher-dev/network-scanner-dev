import React, { useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  Tabs,
  Tab,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';

interface DeviceInfo {
  ip: string;
  hostname?: string;
  os?: string;
  status: string;
  ports?: number[];
}

interface ScanHistoryEntry {
  timestamp: string;
  status: string;
  portsScanned: number[];
}

export const DeviceDetailsModal = ({
  device,
  open,
  onClose,
}: {
  device: DeviceInfo;
  open: boolean;
  onClose: () => void;
}) => {
  const [tabValue, setTabValue] = useState(0);

  // Simulación de datos de historial - esto debería venir de tus datos reales
  const [history] = useState<ScanHistoryEntry[]>([
    {
      timestamp: new Date().toLocaleString(),
      status: device.status,
      portsScanned: device.ports || [],
    },
  ]);

  // Manejador para cambios de pestaña
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box className="device-details-modal">
        <Typography variant="h5">{device.ip}</Typography>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Información General" />
          <Tab label="Puertos y Servicios" />
          <Tab label="Historial" />
        </Tabs>
        <Box className="details-content">
          {tabValue === 0 && (
            <Box>
              <Typography>Hostname: {device.hostname || 'N/A'}</Typography>
              <Typography>Sistema Operativo: {device.os || 'Desconocido'}</Typography>
              <Typography>Estado: {device.status}</Typography>
            </Box>
          )}
          {tabValue === 1 && (
            <Box>
              {device.ports?.map((port: number) => <Chip key={port} label={`Puerto ${port}`} />)}
            </Box>
          )}
          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Historial de actividad
              </Typography>
              <List>
                {history.map((entry, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={`Escaneado: ${entry.timestamp}`}
                      secondary={
                        <>
                          <Typography component="span" variant="body2">
                            Estado: {entry.status}
                          </Typography>
                          <br />
                          <Typography component="span" variant="body2">
                            Puertos escaneados: {entry.portsScanned.join(', ')}
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

interface ResultsGridProps {
  scanResults: DeviceInfo[];
}

const ResultsGrid: React.FC<ResultsGridProps> = ({ scanResults }) => {
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const columns: GridColDef[] = [
    { field: 'ip', headerName: 'IP', flex: 1 },
    { field: 'hostname', headerName: 'Hostname', flex: 1 },
    { field: 'status', headerName: 'Estado', flex: 1 },
    { field: 'os', headerName: 'Sistema Operativo', flex: 1 },
  ];

  const handleDeviceClick = (device: DeviceInfo) => {
    setSelectedDevice(device);
    setModalOpen(true);
  };

  return (
    <Box sx={{ height: 400, width: '100%' }}>
      <DataGrid
        rows={scanResults.map((result, index) => ({ ...result, id: index }))}
        columns={columns}
        onRowClick={(params: GridRowParams) => handleDeviceClick(params.row as DeviceInfo)}
        disableRowSelectionOnClick
      />
      {selectedDevice && (
        <DeviceDetailsModal
          device={selectedDevice}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </Box>
  );
};

export default ResultsGrid;
