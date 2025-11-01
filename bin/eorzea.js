#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use tsx to run the TypeScript source directly
const cliPath = join(__dirname, '..', 'src', 'cli.ts');
const tsxPath = join(__dirname, '..', 'node_modules', '.bin', 'tsx');

// Spawn tsx with the CLI script and pass through all arguments
const child = spawn(tsxPath, [cliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
