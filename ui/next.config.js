/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@backbone/core'],
  
  // Optimize for production
  output: 'standalone',
  
  // Enable production source maps for debugging
  productionBrowserSourceMaps: false,
  
  // Disable x-powered-by header
  poweredByHeader: false,
}

module.exports = nextConfig
