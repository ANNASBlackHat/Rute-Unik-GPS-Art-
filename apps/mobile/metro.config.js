const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro resolve mobile node_modules first, then hoisted root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Prevent Metro from ascending the filesystem hierarchy to resolve mismatched packages
config.resolver.disableHierarchicalLookup = true;

// 4. In monorepos, resolve asset plugins to absolute file paths so hoisted Metro can find them
if (config.transformer?.assetPlugins) {
  config.transformer.assetPlugins = config.transformer.assetPlugins.map((plugin) => {
    try {
      return require.resolve(plugin, { paths: [projectRoot, monorepoRoot] });
    } catch {
      return plugin;
    }
  });
}

module.exports = config;
