import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* Config options here */
  output: 'standalone',
  reactCompiler: true,
  logging: false,
  allowedDevOrigins: ['dev.gutschi.site'],
}

export default nextConfig
