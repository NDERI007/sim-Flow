import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    'https://temple-democrat-air-purchases.trycloudflare.com', // Your Cloudflare tunnel domain
  ],
};

export default nextConfig;
