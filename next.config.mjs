/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Electron
  output: process.env.ELECTRON_BUILD ? 'standalone' : undefined,
  // Disable image optimization for Electron builds
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
