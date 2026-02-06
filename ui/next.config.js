const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@backbone/core'],

  // Turbopack resolve alias — maps @backbone/core to filesystem path
  // Required because Turbopack doesn't follow workspace symlinks for JSON imports
  turbopack: {
    resolveAlias: {
      '@backbone/core': path.resolve(__dirname, '../packages/core'),
    },
  },

  // Optimize for production
  output: 'standalone',

  // Enable production source maps for debugging
  productionBrowserSourceMaps: false,

  // Disable x-powered-by header
  poweredByHeader: false,
}

module.exports = nextConfig
