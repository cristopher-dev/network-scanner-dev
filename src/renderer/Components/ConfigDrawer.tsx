import React from 'react';
import { Drawer, Box, Typography, List, ListItem, Slider, TextField } from '@mui/material';

interface Config {
  timeout: number;
  batchSize: number;
  startRange: number;
  endRange: number;
}

interface Props {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  config: Config;
  setConfig: (config: Config) => void;
}

const ConfigDrawer: React.FC<Props> = ({ drawerOpen, setDrawerOpen, config, setConfig }) => (
  <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
    <Box sx={{ width: 350, p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Configuración Avanzada
      </Typography>
      <List>
        <ConfigSlider
          label="Timeout (ms)"
          value={config.timeout}
          onChange={(v) => setConfig({ ...config, timeout: v })}
          min={500}
          max={5000}
          step={100}
        />
        <ConfigSlider
          label="Tamaño de Lote"
          value={config.batchSize}
          onChange={(v) => setConfig({ ...config, batchSize: v })}
          min={5}
          max={50}
          step={5}
        />
        <ConfigRange
          label="Rango IP"
          startValue={config.startRange}
          endValue={config.endRange}
          onStartChange={(v) => setConfig({ ...config, startRange: v })}
          onEndChange={(v) => setConfig({ ...config, endRange: v })}
        />
      </List>
    </Box>
  </Drawer>
);

const ConfigSlider: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
}> = ({ label, value, onChange, min, max, step }) => (
  <ListItem>
    <Box sx={{ width: '100%' }}>
      <Typography variant="body1">{label}</Typography>
      <Box sx={{ mt: 1 }}>
        <Slider
          value={value}
          onChange={(_, v) => onChange(v as number)}
          min={min}
          max={max}
          step={step}
        />
      </Box>
    </Box>
  </ListItem>
);

const ConfigRange: React.FC<{
  label: string;
  startValue: number;
  endValue: number;
  onStartChange: (value: number) => void;
  onEndChange: (value: number) => void;
}> = ({ label, startValue, endValue, onStartChange, onEndChange }) => (
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
