/**
 * Standalone webpack config (no Nx) for local API serve when Nx native is blocked.
 */
const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: path.join(__dirname, 'src/main.ts'),
  target: 'node',
  mode: 'development',
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'main.js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      'class-transformer/storage': require.resolve(
        'class-transformer/cjs/storage.js',
      ),
      'class-transformer/cjs/storage': require.resolve(
        'class-transformer/cjs/storage.js',
      ),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: path.join(__dirname, 'swc-inline-loader.cjs'),
        },
      },
    ],
  },
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /^pg-native$/,
    }),
    new webpack.IgnorePlugin({
      checkResource(resource) {
        return [
          '@nestjs/websockets/socket-module',
          '@nestjs/microservices/microservices-module',
          '@nestjs/microservices',
        ].includes(resource);
      },
    }),
  ],
  externalsPresets: { node: true },
  externals: [
    ({ request }, callback) => {
      const alwaysBundle = request && /\.(ts|tsx)$/.test(request);
      if (alwaysBundle) return callback();
      // Keep workspace / relative imports bundled; externalize packages.
      if (
        request &&
        !request.startsWith('.') &&
        !request.startsWith('/') &&
        !path.isAbsolute(request)
      ) {
        return callback(null, 'commonjs ' + request);
      }
      return callback();
    },
  ],

  ignoreWarnings: [/Failed to parse source map/],
};
