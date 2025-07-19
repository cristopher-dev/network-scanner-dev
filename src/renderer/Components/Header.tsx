import React from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  TextField,
  IconButton,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

interface Props {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  handleScan: () => void;
  scanning: boolean;
}

const Header: React.FC<Props> = ({
  darkMode,
  setDarkMode,
  searchTerm,
  setSearchTerm,
  handleScan,
  scanning,
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
        InputProps={{ startAdornment: <SearchIcon /> }}
        className="search-field"
      />
      <Button
        variant="contained"
        onClick={handleScan}
        disabled={scanning}
        startIcon={scanning ? <StopIcon /> : <PlayArrowIcon />}
        sx={{
          borderRadius: 2,
          px: 3,
          py: 1,
          fontWeight: 600,
          textTransform: 'none',
          minWidth: 140,
          background: scanning
            ? 'linear-gradient(45deg, #ef4444 30%, #dc2626 90%)'
            : 'linear-gradient(45deg, #3b82f6 30%, #2563eb 90%)',
          '&:hover': {
            background: scanning
              ? 'linear-gradient(45deg, #dc2626 30%, #b91c1c 90%)'
              : 'linear-gradient(45deg, #2563eb 30%, #1d4ed8 90%)',
          },
          '&:disabled': {
            background: 'linear-gradient(45deg, #6b7280 30%, #4b5563 90%)',
          },
        }}
      >
        {scanning ? 'Escaneando...' : 'Escanear Red'}
      </Button>
      <IconButton
        onClick={handleScan}
        disabled={scanning}
        color="primary"
        className="scan-button-icon"
        title="Escaneo rápido"
        sx={{ ml: 1 }}
      >
        <RefreshIcon />
      </IconButton>
    </Box>
  </Box>
);

export default Header;
