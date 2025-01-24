import React from 'react';
import { Box, Typography, FormControlLabel, Switch, TextField, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

const Header = ({
  darkMode,
  setDarkMode,
  searchTerm,
  setSearchTerm,
  handleScan,
  scanning,
}: {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  handleScan: () => void;
  scanning: boolean;
}) => (
  <Box className="header-container">
    <Box className="title-section">
      <Typography variant="h3" className="title" fontWeight="bold">
        Network Scanner
      </Typography>
      <Typography variant="subtitle1" color="text.secondary">
        Monitoreo y análisis de red en tiempo real
      </Typography>
    </Box>
    <Box className="controls">
      <FormControlLabel
        control={
          <Switch
            checked={darkMode}
            onChange={() => setDarkMode(!darkMode)}
            icon={<LightModeIcon />}
            checkedIcon={<DarkModeIcon />}
          />
        }
        label=""
      />
      <TextField
        variant="outlined"
        size="small"
        placeholder="Buscar dispositivos..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: <SearchIcon />,
        }}
        className="search-field"
      />
      <IconButton
        onClick={handleScan}
        disabled={scanning}
        color="primary"
        className="scan-button"
        title="Iniciar escaneo"
      >
        <RefreshIcon />
      </IconButton>
    </Box>
  </Box>
);

export default Header;
