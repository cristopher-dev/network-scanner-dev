import React from 'react';
import { Drawer, Box, Typography, List, ListItem, Slider, TextField } from '@mui/material';

const ConfigDrawer = ({
  drawerOpen,
  setDrawerOpen,
  config,
  setConfig,
}: {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  config: any;
  setConfig: (config: any) => void;
}) => (
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

export default ConfigDrawer;
