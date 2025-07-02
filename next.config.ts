import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    'https://advancement-extensions-incoming-accessing.trycloudflare.com', // Your Cloudflare tunnel domain
  ],
};

export default nextConfig;
