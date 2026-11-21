import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* Config options here */
  output: 'standalone',
  // The assistant reads its system prompt and skills from disk at runtime, so the standalone trace must carry them.
  outputFileTracingIncludes: { '/startpage/**': ['./app/startpage/assistant/_skills/**/*', './app/startpage/assistant/chat/system.md'] },
  reactCompiler: true,
  logging: false,
  allowedDevOrigins: ['dev.gutschi.site'],
}

export default nextConfig
