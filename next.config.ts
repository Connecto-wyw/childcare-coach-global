// next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {},
  },
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  async redirects() {
    // ✅ 루트(/)만 /coach로 보냄 (영구 리다이렉트 금지)
    return [{ source: '/', destination: '/coach', permanent: false }]
  },
}

export default nextConfig
