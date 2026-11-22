#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const expoCli = require.resolve('@expo/cli', {
  paths: [require.resolve('expo/package.json', { paths: [projectRoot] })],
});

const args = process.argv.slice(2);
const bundleOutputIdx = args.indexOf('--bundle-output');
const bundleOutput =
  bundleOutputIdx !== -1 && args[bundleOutputIdx + 1]
    ? path.resolve(process.cwd(), args[bundleOutputIdx + 1])
    : null;

const result = spawnSync(process.execPath, [expoCli, ...args], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: process.env,
});

if (result.status === 0) {
  process.exit(0);
}

// On Windows, @tailwindcss/oxide / lightningcss Rust N-API addons can trigger
// STATUS_ACCESS_VIOLATION (0xC0000005 / -1073741819 / 3221225477) during
// DllMain(DLL_PROCESS_DETACH) after export:embed has already written all outputs.
const isWinAccessViolation =
  process.platform === 'win32' &&
  (result.status === -1073741819 || result.status === 3221225477);

if (isWinAccessViolation && bundleOutput && fs.existsSync(bundleOutput)) {
  const stat = fs.statSync(bundleOutput);
  if (stat.size > 0) {
    console.log(
      `[expo-cli-wrapper] Bundle verified (${stat.size} bytes at ${bundleOutput}); ignoring Windows N-API exit 0xC0000005.`
    );
    process.exit(0);
  }
}

process.exit(result.status ?? 1);
