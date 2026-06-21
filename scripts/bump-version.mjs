#!/usr/bin/env node
// Compute and apply the next version from the number of changed files.
//
// Rules (per project policy):
//   files <= 10            -> patch bump
//   files >= 11            -> minor bump
//   minor reaches 10       -> roll over to a major bump
//   files >= 70            -> major bump
//
// Usage: node scripts/bump-version.mjs <changedFileCount>
// Updates app/main/package.json, root Cargo.toml, and tauri.conf.json, prints the
// new version, and (in CI) appends `version`/`bump` to $GITHUB_OUTPUT.

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const changed = Number.parseInt(process.argv[2] ?? '0', 10) || 0;

const pkgPath = 'app/main/package.json';
const cargoPath = 'Cargo.toml';
const confPath = 'app/main/src-tauri/tauri.conf.json';

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
let [major, minor, patch] = pkg.version.split('.').map((n) => Number.parseInt(n, 10));

let bump = changed >= 70 ? 'major' : changed >= 11 ? 'minor' : 'patch';

if (bump === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (bump === 'minor') {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

// A minor that reaches 10 rolls over into a major.
if (minor >= 10) {
  major += 1;
  minor = 0;
  patch = 0;
  bump = 'major';
}

const version = `${major}.${minor}.${patch}`;

pkg.version = version;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const cargo = readFileSync(cargoPath, 'utf8').replace(
  /version = "\d+\.\d+\.\d+"/,
  `version = "${version}"`,
);
writeFileSync(cargoPath, cargo);

const conf = JSON.parse(readFileSync(confPath, 'utf8'));
conf.version = version;
writeFileSync(confPath, `${JSON.stringify(conf, null, 2)}\n`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\nbump=${bump}\n`);
}
console.log(`bump=${bump} files=${changed} -> v${version}`);
