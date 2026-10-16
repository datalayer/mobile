/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * expo-doctor 1.20's bundled spawn-async loses stdout from JavaScript child
 * processes under this Node toolchain. Doctor consequently sees an empty
 * result from `npx expo config --json --full` and cannot inspect the project.
 *
 * Prepend a Doctor-only `node` bridge to PATH. The bridge invokes this exact
 * Node executable, captures its output and emits it from Bash, whose stdout
 * spawn-async receives correctly. This does not affect Metro, native builds,
 * the application, or any command other than this Doctor process tree.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// The package's own `bin`, found on disk: newer expo-doctor releases export no subpath to require.resolve.
function doctorBin(from) {
  for (let dir = from; ; dir = path.dirname(dir)) {
    const manifest = path.join(dir, 'node_modules', 'expo-doctor', 'package.json');
    if (fs.existsSync(manifest)) {
      const { bin } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      return path.join(path.dirname(manifest), typeof bin === 'string' ? bin : bin['expo-doctor']);
    }
    if (path.dirname(dir) === dir) {
      throw new Error('expo-doctor is not installed');
    }
  }
}

const projectDirectory = process.cwd();
const doctor = doctorBin(projectDirectory);
const bridgeDirectory = path.join(projectDirectory, 'scripts', 'doctor-bin');
const result = spawnSync(process.execPath, [doctor], {
  cwd: projectDirectory,
  env: {
    ...process.env,
    DATALAYER_DOCTOR_REAL_NODE: process.execPath,
    PATH: `${bridgeDirectory}${path.delimiter}${process.env.PATH ?? ''}`
  },
  stdio: 'inherit'
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);

