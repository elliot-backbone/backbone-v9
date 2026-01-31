/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // API proxy for local development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_URL || 'http://localhost:4000/api/:path*',
      },
    ];
  },
  
  // Optimize for production
  output: 'standalone',
  
  // Enable production source maps for debugging
  productionBrowserSourceMaps: false,
  
  // Disable x-powered-by header
  poweredByHeader: false,
}

module.exports = nextConfig
