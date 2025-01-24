import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

const FilterMenu = () => (
  <Box sx={{ mb: 3 }}>
    <Typography variant="subtitle2" gutterBottom>
      Filtrar por:
    </Typography>
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Chip label="Todos" onClick={() => {}} color="primary" variant="outlined" />
      <Chip label="Activos" onClick={() => {}} color="success" variant="outlined" />
      <Chip label="Inactivos" onClick={() => {}} color="error" variant="outlined" />
    </Box>
  </Box>
);

export default FilterMenu;
