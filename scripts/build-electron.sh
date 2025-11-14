#!/bin/bash

# Build script for Electron application
# This script builds the Next.js app and then packages it with Electron

set -e  # Exit on error

echo "🚀 Building ARCH Freight Calculator Electron App..."

# Check if we're building for a specific platform
PLATFORM=${1:-""}

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  pnpm install
fi

# Build Electron application (scripts run Next build with ELECTRON_BUILD=1)
echo "📱 Packaging Electron application..."
case "$PLATFORM" in
  mac)
    echo "Building for macOS..."
    pnpm electron:build:mac
    ;;
  win)
    echo "Building for Windows..."
    pnpm electron:build:win
    ;;
  *)
    echo "Building for current platform..."
    pnpm electron:build
    ;;
esac

echo "✅ Build complete! Check the 'dist' directory for the executable."
