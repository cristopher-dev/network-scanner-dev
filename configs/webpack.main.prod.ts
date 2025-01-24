import path from 'path';
import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';

// Rutas comunes
const PATHS = {
  root: path.join(__dirname, '..'),
  src: path.join(__dirname, '../src'),
  output: path.join(__dirname, '../app/dist/main'),
};

const mainConfig: webpack.Configuration = {
  mode: 'production',
  devtool: 'source-map',
  target: 'electron-main',
  stats: 'errors-only',

  // Puntos de entrada
  entry: {
    main: path.join(PATHS.src, 'main/main.ts'),
    preload: path.join(PATHS.src, 'main/preload.ts'),
  },

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
      ELECTRON_ENV: process.env.ELECTRON_ENV || 'production',
    }),
  ],

  // Resolución de módulos
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    modules: [path.join(PATHS.src), 'node_modules'],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: path.join(PATHS.root, 'tsconfig.json'),
      }),
    ],
  },

  // Optimización
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
      }),
      new CssMinimizerPlugin(),
    ],
    splitChunks: {
      chunks: 'all',
    },
  },

  cache: {
    type: 'filesystem',
  },

  // Salida
  output: {
    path: PATHS.output,
    filename: '[name].js',
  },
};

export default mainConfig;
