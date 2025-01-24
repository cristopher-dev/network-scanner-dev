import React from 'react';
import { Grid, Card, Box, Typography, Chip, Tooltip, Grow } from '@mui/material';

const ResultsGrid = ({ scanResults }: { scanResults: any[] }) => (
  <Grid container spacing={3} className="results-grid">
    {scanResults.map((result, index: number) => (
      <Grow
        in={true}
        style={{ transformOrigin: '0 0 0' }}
        timeout={300 + index * 100}
        key={result.ip}
      >
        <Grid item xs={12} sm={6} md={4}>
          <Tooltip title="Click para más detalles" arrow>
            <Card className="device-card">
              <Box className="card-header">
                <Typography variant="h6">{result.ip}</Typography>
                <Chip
                  size="small"
                  label={result.status === 'up' ? 'Activo' : 'Inactivo'}
                  color={result.status === 'up' ? 'success' : 'error'}
                />
              </Box>
              <Box className="card-content">
                {result.hostname && (
                  <Typography variant="body2">Hostname: {result.hostname}</Typography>
                )}
                {result.os && (
                  <Typography variant="body2" className="os-info">
                    SO: {result.os}
                  </Typography>
                )}
                {result.ports && (
                  <Box className="ports-section">
                    <Typography variant="body2">Puertos:</Typography>
                    <Box className="ports-container">
                      {result.ports.map((port: number) => (
                        <Chip
                          key={port}
                          label={port}
                          size="small"
                          variant="outlined"
                          className="port-chip"
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Card>
          </Tooltip>
        </Grid>
      </Grow>
    ))}
  </Grid>
);

export default ResultsGrid;
