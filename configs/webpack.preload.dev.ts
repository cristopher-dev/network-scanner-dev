import path from 'path';
import webpack from 'webpack';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';

// Definición de rutas base
const PATHS = {
  root: path.join(__dirname, '..'),
  src: path.join(__dirname, '../src'),
  dist: path.join(__dirname, '../app/dist/main'),
  tsconfig: path.resolve(__dirname, '../tsconfig.json'),
};

const preloadConfig: webpack.Configuration = {
  // Configuración básica
  mode: 'development',
  devtool: 'inline-source-map',
  target: 'electron-preload',
  stats: 'errors-only',
  watch: true,

  // Punto de entrada
  entry: path.join(PATHS.src, 'main/preload.ts'),

  // Reglas de módulos
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            compilerOptions: { module: 'esnext' },
          },
        },
      },
    ],
  },

  // Plugins
  plugins: [
    new webpack.EnvironmentPlugin({
      ELECTRON_ENV: JSON.stringify(process.env.ELECTRON_ENV || 'production'),
    }),
  ],

  // Resolución
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    modules: [path.join(PATHS.src), 'node_modules'],
    plugins: [new TsconfigPathsPlugin({ configFile: PATHS.tsconfig })],
  },

  // Salida
  output: {
    path: PATHS.dist,
    filename: 'preload.js',
  },
};

export default preloadConfig;
