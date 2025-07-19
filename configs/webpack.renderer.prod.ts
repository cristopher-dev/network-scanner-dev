import path from 'path';
import webpack from 'webpack';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin';
import sass from 'sass';

// Rutas base
const PATHS = {
  root: path.join(__dirname, '..'),
  src: path.join(__dirname, '../src'),
  dist: path.join(__dirname, '../app/dist/renderer'),
  tsconfig: path.resolve(__dirname, '../tsconfig.json'),
};

const Configuration: webpack.Configuration = {
  mode: 'production',
  devtool: 'source-map',
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
    new MiniCssExtractPlugin({ filename: 'style.css' }),
    new webpack.EnvironmentPlugin({
      ELECTRON_ENV: JSON.stringify(process.env.ELECTRON_ENV || 'production'),
    }),
  ],

  // Resolución de módulos
  resolve: {
    alias: {
      '@Main': path.resolve(__dirname, '../src/main'),
      // otros alias si los hay
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

  // Cache
  cache: {
    type: 'filesystem',
  },

  // Salida
  output: {
    path: PATHS.dist,
    filename: '[name].js',
    publicPath: './',
  },
};

export default Configuration;
