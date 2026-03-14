#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const srcDir = path.join(__dirname, 'commands');
const destDir = path.join(os.homedir(), '.claude', 'commands');

function removeRecursive(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) {
      removeRecursive(path.join(target, entry));
    }
    fs.rmdirSync(target);
  } else {
    fs.unlinkSync(target);
  }
}

function uninstall() {
  if (!fs.existsSync(srcDir)) {
    console.error('commands/ directory not found in package. Cannot determine what to remove.');
    process.exit(1);
  }

  const entries = fs.readdirSync(srcDir);
  let removed = 0;

  for (const entry of entries) {
    const target = path.join(destDir, entry);
    if (fs.existsSync(target)) {
      removeRecursive(target);
      console.log(`Removed: ${target}`);
      removed++;
    } else {
      console.log(`Skipped (not found): ${target}`);
    }
  }

  console.log(`\nDone. ${removed} skill(s) removed from ${destDir}`);
}

uninstall();
