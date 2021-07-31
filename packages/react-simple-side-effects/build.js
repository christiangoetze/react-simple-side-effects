const path = require('path');
const esbuild = require('esbuild');
const packageJson = require('./package.json');
const external = Object.keys(packageJson.peerDependencies || {}).concat(
  Object.keys(packageJson.devDependencies || {})
);

function build(file) {
  return esbuild.build({
    entryPoints: [file],
    bundle: true,
    platform: 'node',
    target: ['node14'],
    outfile: `dist/index.js`,
    minify: true,
    logLevel: 'error',
    external,
  });
}

build(`lib/index.ts`);