/**
 * Temporary Nest bootstrap when Nx native binary is blocked by Windows policy.
 * Builds with standalone webpack + SWC, then runs dist/main.js.
 */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '../..');
const apiRoot = __dirname;
const envPath = path.join(root, '.env');

function loadEnv() {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i <= 0) continue;
    const key = trimmed.slice(0, i);
    let val = trimmed.slice(i + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnv();
process.env.PORT = process.env.PORT || '3333';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const webpackCli = require.resolve('webpack-cli/bin/cli.js');
const build = spawnSync(
  process.execPath,
  [webpackCli, 'build', '--config', 'webpack.dev-standalone.cjs'],
  { cwd: apiRoot, stdio: 'inherit', env: process.env },
);

if (build.status !== 0) {
  console.error('API webpack build failed');
  process.exit(build.status || 1);
}

process.chdir(root);
require('reflect-metadata');
require(path.join(apiRoot, 'dist/main.js'));
