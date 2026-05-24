#!/usr/bin/env node
/**
 * git-commit.cjs — Wrapper de commit fiable sur Windows bash.
 *
 * Problème : `git commit -m "subject\n\nbody"` sur Windows bash squash les
 * sauts de ligne → commitlint rejette avec `body-leading-blank`.
 *
 * Solution : écrire le message dans un fichier temporaire avec des newlines
 * Unix explicits, puis utiliser `git commit --file=<tmp>`.
 *
 * Usage :
 *   node scripts/git-commit.cjs [--amend] <message>
 *
 * Le message doit contenir une vraie ligne vide entre le sujet et le body.
 * Utiliser \n dans la chaîne JS — Node.js gère les newlines correctement.
 *
 * Exemples (depuis npm scripts ou terminal) :
 *   node scripts/git-commit.cjs "feat(scope): titre\n\nBody détaillé ici."
 *   node scripts/git-commit.cjs --amend "fix(scope): correction\n\nBody."
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const args = process.argv.slice(2);
const amend = args[0] === '--amend';
const msgArg = amend ? args[1] : args[0];

if (!msgArg) {
  console.error('Usage: node scripts/git-commit.cjs [--amend] "<message>"');
  process.exit(1);
}

// Interpréter les \n littéraux éventuellement présents dans la chaîne
const message = msgArg.replace(/\\n/g, '\n');

// Écrire dans un fichier temporaire avec newlines Unix
const tmpFile = path.join(os.tmpdir(), `git-commit-msg-${Date.now()}.txt`);
fs.writeFileSync(tmpFile, message.endsWith('\n') ? message : message + '\n', { encoding: 'utf8' });

try {
  // Stage all changes (tracked + untracked) before committing
  if (!amend) {
    execSync('git add -A', { stdio: 'inherit' });
  }
  const cmd = amend
    ? `git commit --amend --file="${tmpFile}"`
    : `git commit --file="${tmpFile}"`;
  execSync(cmd, { stdio: 'inherit' });
} finally {
  fs.unlinkSync(tmpFile);
}

