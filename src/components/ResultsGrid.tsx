import React from 'react';
import { Modal, Box, Chip } from '@mui/material';

interface DeviceDetailsModalProps {
  open: boolean;
  onClose: () => void;
  device: {
    ip: string;
    ports?: number[];
  };
  tabValue: number;
}

const DeviceDetailsModal: React.FC<DeviceDetailsModalProps> = ({ open, onClose, device, tabValue }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <Box>
        {tabValue === 1 && (
          <Box>
            {device.ports?.map((port: number, index: number) => (
              <Chip
                key={`${device.ip}-port-${port}-${index}`}
                label={`Puerto ${port}`}
              />
            ))}
          </Box>
        )}
      </Box>
    </Modal>
  );
};

export default DeviceDetailsModal;
