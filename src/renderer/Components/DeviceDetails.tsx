import React from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, Box, Chip } from '@mui/material';

interface DeviceDetailsProps {
  device: any;
  open: boolean;
  onClose: () => void;
}

const DeviceDetails: React.FC<DeviceDetailsProps> = ({ device, open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Detalles del Dispositivo</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">IP: {device?.ip}</Typography>
          <Typography variant="body1">Estado: {device?.status}</Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">Puertos abiertos:</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
              {device?.ports?.map((port: number) => (
                <Chip key={port} label={port} color="primary" variant="outlined" />
              ))}
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceDetails;
