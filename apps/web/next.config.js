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
    NEXT_PUBLIC_PLATFORM_DOMAIN: process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? '',
  },
  async rewrites() {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api').replace(
      /\/+$/,
      '',
    );
    return [
      // Uploaded files (product images, logos) are stored relative as
      // /api/uploads/... but served by the Nest API, not Next.js.
      {
        source: '/api/uploads/:path*',
        destination: `${apiBase}/uploads/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      // Local MinIO object storage (product images)
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9000',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
