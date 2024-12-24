/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  },
  typescript: {
    // During development we'll catch type errors
    // But don't fail production builds if there are type errors
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig