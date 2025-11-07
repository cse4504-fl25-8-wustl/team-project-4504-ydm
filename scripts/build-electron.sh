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

# Build Next.js application
echo "🔨 Building Next.js application..."
export ELECTRON_BUILD=true
pnpm build

# Build Electron application
echo "📱 Packaging Electron application..."
if [ "$PLATFORM" = "mac" ]; then
  echo "Building for macOS..."
  pnpm electron:build:mac
elif [ "$PLATFORM" = "win" ]; then
  echo "Building for Windows..."
  pnpm electron:build:win
else
  echo "Building for current platform..."
  pnpm electron:build
fi

echo "✅ Build complete! Check the 'dist' directory for the executable."
