// next.config.js

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
    // 루트만 /coach로 보냄. 정적 파일(/favicon.ico 등)은 영향 없음.
    return [
      { source: '/', destination: '/coach', permanent: true },
    ]
  },
}

export default nextConfig
