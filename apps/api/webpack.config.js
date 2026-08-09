const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  resolve: {
    alias: {
      'class-transformer/storage': require.resolve('class-transformer/cjs/storage.js'),
      'class-transformer/cjs/storage': require.resolve('class-transformer/cjs/storage.js'),
    },
  },
  externals: {
    '@laam/types': 'commonjs @laam/types',
    '@nestjs/swagger': 'commonjs @nestjs/swagger',
    'swagger-ui-express': 'commonjs swagger-ui-express',
    'swagger-ui-dist': 'commonjs swagger-ui-dist',
    'class-transformer': 'commonjs class-transformer',
    'class-validator': 'commonjs class-validator',
    'express': 'commonjs express',
    '@prisma/client': 'commonjs @prisma/client',
    'bcryptjs': 'commonjs bcryptjs',
    'nodemailer': 'commonjs nodemailer',
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
    }),
  ],
};
