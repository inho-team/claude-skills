#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const srcDir = path.join(__dirname, 'skills');
const destDir = path.join(os.homedir(), '.claude', 'commands');

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function install() {
  if (!fs.existsSync(srcDir)) {
    console.error('skills/ directory not found in package. Skipping install.');
    process.exit(1);
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const entries = fs.readdirSync(srcDir);
  for (const entry of entries) {
    const src = path.join(srcDir, entry);
    const dest = path.join(destDir, entry);
    copyRecursive(src, dest);
    console.log(`Installed: ${entry} -> ${dest}`);
  }

  console.log(`\nDone. ${entries.length} skill(s) installed to ${destDir}`);
}

install();
