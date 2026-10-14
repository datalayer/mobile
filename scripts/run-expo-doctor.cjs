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
const path = require('path');

const doctor = require.resolve('expo-doctor/bin/expo-doctor.js');
const projectDirectory = process.cwd();
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

