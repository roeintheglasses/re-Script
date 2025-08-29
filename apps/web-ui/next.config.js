/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@re-script/shared-types', '@re-script/shared-utils'],
  experimental: {
    // App directory is enabled by default in Next.js 14
  },
  env: {
    // API endpoint configuration
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // Webpack configuration for Monaco Editor
  webpack: (config) => {
    config.module.rules.push({
      test: /\.ttf$/,
      type: 'asset/resource',
    });
    return config;
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;