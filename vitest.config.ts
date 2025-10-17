/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],
    // Add reporters configuration
    reporters: ['default', 'html'],
    // Optional: customize output directory
    outputFile: {
      html: './test-report/index.html'
    }
  },
  resolve: {
    alias: {
      '@': './app',
    },
  },
})
