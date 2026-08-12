import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  logging: false,
  allowedDevOrigins: ['dev.gutschi.site'],
}

export default nextConfig
