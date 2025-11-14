import path from 'node:path';

const isElectronBuild = Boolean(process.env.ELECTRON_BUILD);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: isElectronBuild ? 'standalone' : undefined,
  images: {
    unoptimized: true,
  },
  ...(isElectronBuild && {
    outputFileTracingRoot: path.resolve(process.cwd()),
  }),
  // Optimize bundle size for Electron
  experimental: {
    optimizePackageImports: ['react', 'react-dom'],
  },
  // Production optimizations
  productionBrowserSourceMaps: false,
  compress: true,
};

export default nextConfig;
