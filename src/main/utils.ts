import { app } from 'electron';
import path from 'path';
import { port } from '../../DevConfig.json';

type Environment = 'production' | 'development';
const ENV = process.env.NODE_ENV as Environment;
const IS_DEBUG = process.env.ELECTRON_ENV === 'debug';
const getIsPackaged = () => app.isPackaged;
const getBasePath = () => {
  if (ENV === 'production') {
    return getIsPackaged() ? process.resourcesPath : path.resolve(__dirname, '../../..');
  }
  return path.resolve(__dirname, '../..');
};
const getAssetsPath = (fileName: string) => path.join(getBasePath(), 'assets', fileName);
const getHtmlPath = (htmlFileName: string) =>
  ENV === 'development'
    ? `http://localhost:${port}`
    : `file://${path.resolve(__dirname, '../renderer', htmlFileName)}`;
const getPreloadPath = (fileName: string) =>
  path.resolve(
    ENV === 'development' ? path.resolve(__dirname, '../../app/dist/main') : __dirname,
    fileName,
  );
const installExtensions = (): void => {};
export { IS_DEBUG as isDebug, getAssetsPath, getHtmlPath, getPreloadPath, installExtensions };
