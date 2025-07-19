import sass from 'sass';
import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import { spawn } from 'child_process';
import { port } from '../DevConfig.json';
import 'webpack-dev-server';
// Rutas base
const PATHS = {
  root: path.join(__dirname, '..'),
  src: path.join(__dirname, '../src'),
  dist: path.join(__dirname, '../app/dist/renderer'),
  tsconfig: path.resolve(__dirname, '../tsconfig.json'),
};

// Configuración de webpack
const Configuration: webpack.Configuration = {
  mode: 'development',
  devtool: 'inline-source-map',
  target: ['web', 'electron-renderer'],
  stats: 'errors-only',
  entry: path.join(PATHS.src, 'renderer/index.tsx'),

  // Reglas de módulos
  module: {
    rules: [
      // TypeScript
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: { transpileOnly: true },
        },
      },
      // Estilos
      {
        test: /\.(scss|css)$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              implementation: sass,
              sassOptions: { fiber: false },
            },
          },
        ],
      },
      // Archivos estáticos
      {
        test: /\.(png|jpg|jpeg|gif|ico|svg)$/,
        use: {
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            outputPath: 'assets/',
          },
        },
      },
    ],
  },

  // Plugins
  plugins: [
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.join(PATHS.src, 'renderer/index.html'),
      minify: {
        collapseWhitespace: true,
        removeAttributeQuotes: true,
        removeComments: true,
      },
      isBrowser: false,
    }),
    new ReactRefreshWebpackPlugin(),
    new webpack.EnvironmentPlugin({
      ELECTRON_ENV: JSON.stringify(process.env.ELECTRON_ENV || 'production'),
    }),
  ],

  // Resolución
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@components': path.resolve(__dirname, '../src/renderer/components'),
      '@Main': path.resolve(__dirname, '../src/main'),
    },
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    modules: [path.join(PATHS.src), 'node_modules'],
    plugins: [new TsconfigPathsPlugin({ configFile: PATHS.tsconfig })],
    fallback: {
      path: false,
      fs: false,
      electron: false,
      child_process: false,
      os: false,
      net: false,
      timers: false,
    },
  },

  externals: {
    electron: 'commonjs electron',
  },

  // Salida
  output: {
    path: PATHS.dist,
    filename: '[name].js',
  },

  // Servidor de desarrollo
  devServer: {
    port,
    compress: true,
    hot: true,
    static: { publicPath: '/' },
    headers: { 'Access-Control-Allow-Origin': '*' },
    historyApiFallback: { verbose: true },
    client: { logging: 'error' },
    setupMiddlewares(middlewares) {
      const args = ['run', 'start:main'];
      if (process.env.MAIN_ARGS) {
        args.push(...(process.env.MAIN_ARGS.match(/"[^"]+"|[^\s"]+/g) || []));
      }

      spawn('npm', args, {
        shell: true,
        stdio: 'inherit',
      }).on('close', (code) => process.exit(code));

      return middlewares;
    },
  },
};

export default Configuration;
