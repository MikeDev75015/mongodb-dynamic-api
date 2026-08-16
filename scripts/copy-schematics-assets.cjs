'use strict';

// Copies the schematics collection's non-TypeScript assets (collection.json, schema.json,
// template files) from libs/schematics into dist/schematics, mirroring the same relative
// structure tsc already gave the compiled .js files there. Run after `tsc -p tsconfig.schematics.json`.

const fs = require('node:fs');
const path = require('node:path');

const SOURCE_DIR = path.join(__dirname, '..', 'libs', 'schematics');
const DEST_DIR = path.join(__dirname, '..', 'dist', 'schematics');

fs.cpSync(SOURCE_DIR, DEST_DIR, {
  recursive: true,
  filter: (source) => !source.endsWith('.ts'),
});

console.log(`Copied schematics assets: ${SOURCE_DIR} -> ${DEST_DIR}`);
