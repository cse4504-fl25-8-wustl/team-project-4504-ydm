#!/usr/bin/env node

/**
 * Fix symlinks in .next/standalone by replacing them with actual file copies
 * This is a workaround for Windows permission issues with symlinks
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const standaloneDir = path.join(projectRoot, '.next/standalone');

function isSymlink(filePath) {
  try {
    const stats = fs.lstatSync(filePath);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}

function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

function fixSymlinks(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (isSymlink(fullPath)) {
      try {
        const target = fs.readlinkSync(fullPath);
        const absoluteTarget = path.isAbsolute(target) 
          ? target 
          : path.resolve(path.dirname(fullPath), target);
        
        if (fs.existsSync(absoluteTarget)) {
          // Remove symlink and copy the actual file/directory
          fs.unlinkSync(fullPath);
          
          const stats = fs.statSync(absoluteTarget);
          if (stats.isDirectory()) {
            // For directories, we need to copy recursively
            fs.mkdirSync(fullPath, { recursive: true });
            copyDirectory(absoluteTarget, fullPath);
          } else {
            copyFile(absoluteTarget, fullPath);
          }
          
          console.log(`Fixed symlink: ${path.relative(projectRoot, fullPath)}`);
        }
      } catch (error) {
        console.warn(`Warning: Could not fix symlink ${fullPath}:`, error.message);
      }
    } else if (entry.isDirectory()) {
      fixSymlinks(fullPath);
    }
  }
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

console.log('🔧 Fixing symlinks in standalone build...');
fixSymlinks(standaloneDir);
console.log('✅ Symlink fix complete!');

