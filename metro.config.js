/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../../..');

const config = getDefaultConfig(projectRoot);

// The package's own node_modules first: React must be the one the React Native renderer was built with (MOBILE.md §5.3).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules')
];

const SINGLETONS = ['react', 'react-native'];
const upstream = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const singleton = SINGLETONS.find(name => moduleName === name || moduleName.startsWith(`${name}/`));
  const next = upstream ?? context.resolveRequest;
  if (singleton) {
    return next({ ...context, originModulePath: path.join(projectRoot, 'package.json') }, moduleName, platform);
  }
  return next(context, moduleName, platform);
};

module.exports = config;
