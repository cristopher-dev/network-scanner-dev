import { app } from 'electron';
import path from 'path';
import { port } from '../../DevConfig.json';

// Tipos y constantes básicas
type Environment = 'production' | 'development';
const ENV: Environment = process.env.NODE_ENV as Environment;
const IS_DEBUG = process.env.ELECTRON_ENV === 'debug';

// Función para obtener IS_PACKAGED
const getIsPackaged = (): boolean => {
  return app.isPackaged;
};

// Obtener ruta base de la aplicación
const getBasePath = (): string => {
  if (ENV === 'production') {
    return getIsPackaged() ? process.resourcesPath : path.resolve(__dirname, '../../..');
  }
  return path.resolve(__dirname, '../..');
};

// Obtener ruta de assets
const getAssetsPath = (fileName: string): string => {
  return path.join(getBasePath(), 'assets', fileName);
};

// Obtener ruta HTML
const getHtmlPath = (htmlFileName: string): string => {
  return ENV === 'development'
    ? `http://localhost:${port}`
    : `file://${path.resolve(__dirname, '../renderer', htmlFileName)}`;
};

// Obtener ruta de preload
const getPreloadPath = (fileName: string): string => {
  const preloadBase =
    ENV === 'development' ? path.resolve(__dirname, '../../app/dist/main') : __dirname;
  return path.resolve(preloadBase, fileName);
};

// Extensiones de desarrollo
const installExtensions = (): void => {};

export { IS_DEBUG as isDebug, getAssetsPath, getHtmlPath, getPreloadPath, installExtensions };
