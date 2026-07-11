//@ts-check

const path = require('path');
const { loadEnvConfig } = require('@next/env');

// Monorepo: load env from workspace root (d:\Fardus\.env), not only apps/web
loadEnvConfig(path.join(__dirname, '../..'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@laam/types'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api',
    NEXT_PUBLIC_USE_API: process.env.NEXT_PUBLIC_USE_API ?? 'true',
    NEXT_PUBLIC_ENABLE_ROLE_SWITCH: process.env.NEXT_PUBLIC_ENABLE_ROLE_SWITCH ?? 'false',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
