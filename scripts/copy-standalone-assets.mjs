#!/usr/bin/env node

/**
 * Copy static assets to standalone directory for Electron build
 * This is required because Next.js standalone mode doesn't automatically
 * copy the .next/static and public directories
 *
 * This script is cross-platform compatible (works on macOS, Windows, Linux)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const STANDALONE_DIR = path.join(projectRoot, '.next/standalone');

console.log('📦 Copying static assets to standalone directory...');

// Check if standalone directory exists
if (!fs.existsSync(STANDALONE_DIR)) {
  console.error(`❌ Error: Standalone directory not found at ${STANDALONE_DIR}`);
  console.error('   Please run \'next build\' first with ELECTRON_BUILD=1');
  process.exit(1);
}

/**
 * Recursively copy directory
 */
function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy .next/static to .next/standalone/.next/static
const staticSrc = path.join(projectRoot, '.next/static');
const staticDest = path.join(STANDALONE_DIR, '.next/static');

if (fs.existsSync(staticSrc)) {
  console.log('  → Copying .next/static...');
  copyDir(staticSrc, staticDest);
  console.log(`     Copied to ${path.relative(projectRoot, staticDest)}`);
} else {
  console.warn('⚠️  Warning: .next/static directory not found');
}

// Copy public directory to .next/standalone/public (if it exists)
const publicSrc = path.join(projectRoot, 'public');
const publicDest = path.join(STANDALONE_DIR, 'public');

if (fs.existsSync(publicSrc)) {
  console.log('  → Copying public directory...');
  copyDir(publicSrc, publicDest);
  console.log(`     Copied to ${path.relative(projectRoot, publicDest)}`);
} else {
  console.log('ℹ️  No public directory found (this is OK if you don\'t have one)');
}

console.log('✅ Static assets copied successfully!');
