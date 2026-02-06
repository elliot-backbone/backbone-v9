/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@backbone/core'],

  // Turbopack resolve alias — relative paths from ui/ to packages/core/
  // Required because Turbopack doesn't resolve JSON through workspace symlinks
  turbopack: {
    resolveAlias: {
      '@backbone/core/runtime/engine': '../packages/core/runtime/engine',
      '@backbone/core/raw/sample.json': '../packages/core/raw/sample.json',
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
