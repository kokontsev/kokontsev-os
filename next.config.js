/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_APP_NAME: 'KokontsevOS',
  },
};

module.exports = nextConfig;
