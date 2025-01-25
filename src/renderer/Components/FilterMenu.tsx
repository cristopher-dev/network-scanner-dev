import React from 'react';
import { Box, Stack, Select, MenuItem, SelectChangeEvent } from '@mui/material';

interface FilterMenuProps {
  filters?: {
    status: string;
    orderBy: string;
  };
  onFilterChange?: (event: SelectChangeEvent) => void;
}

const FilterMenu = ({
  filters = { status: 'all', orderBy: 'ip' },
  onFilterChange = () => {},
}: FilterMenuProps) => (
  <Box sx={{ mb: 3 }}>
    <Stack direction="row" spacing={2}>
      <Select value={filters.status} onChange={onFilterChange} name="status">
        <MenuItem value="all">Todos los dispositivos</MenuItem>
        <MenuItem value="active">Activos</MenuItem>
        <MenuItem value="inactive">Inactivos</MenuItem>
      </Select>
      <Select value={filters.orderBy} onChange={onFilterChange} name="orderBy">
        <MenuItem value="ip">Ordenar por IP</MenuItem>
        <MenuItem value="status">Ordenar por Estado</MenuItem>
        <MenuItem value="ports">Ordenar por Puertos</MenuItem>
      </Select>
    </Stack>
  </Box>
);

export default FilterMenu;
