#!/bin/bash

# Test script to launch the packaged Electron app with logging
# This helps debug startup issues

echo "🧪 Testing ARCH Freight Calculator..."
echo "======================================="
echo ""

APP_PATH="dist/mac-arm64/ARCH Freight Calculator.app"

if [ ! -d "$APP_PATH" ]; then
  echo "❌ Error: App not found at $APP_PATH"
  echo "   Please run 'pnpm electron:build:mac' first"
  exit 1
fi

echo "📦 App found at: $APP_PATH"
echo "🚀 Launching application..."
echo ""
echo "--- Application Output ---"

# Launch the app and show all console output
"$APP_PATH/Contents/MacOS/ARCH Freight Calculator" 2>&1

echo ""
echo "--- Application Exited ---"
