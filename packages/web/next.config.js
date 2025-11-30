/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@thumbnail-system/shared'],
  output: 'export',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
