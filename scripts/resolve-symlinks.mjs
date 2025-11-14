#!/usr/bin/env node

/**
 * Resolve pnpm symlinks in .next/standalone/node_modules
 * This is needed because electron-builder doesn't handle symlinks well
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const standaloneNodeModules = path.join(projectRoot, '.next/standalone/node_modules');

console.log('🔗 Resolving pnpm symlinks in standalone...');

if (!fs.existsSync(standaloneNodeModules)) {
  console.log('  ⚠️  No standalone node_modules found, skipping');
  process.exit(0);
}

function copyRecursive(src, dest) {
  const stat = fs.lstatSync(src);

  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else if (stat.isSymbolicLink()) {
    // Skip broken symlinks
    try {
      const target = fs.readlinkSync(src);
      const absoluteTarget = path.resolve(path.dirname(src), target);
      if (fs.existsSync(absoluteTarget)) {
        copyRecursive(absoluteTarget, dest);
      }
    } catch (err) {
      // Ignore broken symlinks
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

const entries = fs.readdirSync(standaloneNodeModules, { withFileTypes: true });
let resolvedCount = 0;

for (const entry of entries) {
  if (entry.isSymbolicLink() && entry.name !== '.pnpm') {
    const entryPath = path.join(standaloneNodeModules, entry.name);

    try {
      const target = fs.readlinkSync(entryPath);
      const absoluteTarget = path.resolve(path.dirname(entryPath), target);

      if (fs.existsSync(absoluteTarget)) {
        console.log(`  → Resolving ${entry.name}...`);

        // Remove symlink
        fs.unlinkSync(entryPath);

        // Copy actual files
        copyRecursive(absoluteTarget, entryPath);
        resolvedCount++;
      }
    } catch (err) {
      console.log(`  ✗ Failed to resolve ${entry.name}: ${err.message}`);
    }
  }
}

console.log(`\n✅ Resolved ${resolvedCount} symlinks`);
