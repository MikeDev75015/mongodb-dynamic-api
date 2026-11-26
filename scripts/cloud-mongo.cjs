#!/usr/bin/env node
/**
 * cloud-mongo.cjs — Starts a single-member MongoDB replica set for the e2e suite, without Docker.
 *
 * Why: the e2e suite needs a real MongoDB *replica set* (transactions, used by cascade delete —
 * see helpers/mongo-transaction.helper.ts). Locally and in CircleCI this comes from
 * `docker compose up` (compose.yaml), but Claude Code cloud sessions have no Docker daemon.
 * mongodb-memory-server (already a devDependency) downloads a real mongod binary and runs it as a
 * plain child process, which works anywhere Node does.
 *
 * Long-running: keeps the replica set alive until the process is killed. Once the replica set is
 * ready, the connection URI is written to MDA_MONGO_URI_FILE (default: <os tmpdir>/mda-mongo-uri)
 * so a caller (scripts/cloud-setup.sh) can wait for it and export MONGO_DB_URL.
 *
 * Idempotent: if MDA_MONGO_PORT is already accepting connections and the URI file exists, it
 * assumes a previous run is still alive and exits 0 immediately.
 *
 * No auth: the e2e suite only ever reads MONGO_DB_URL, it never assumes specific credentials.
 *
 * Env:
 *   MDA_MONGO_PORT      port of the single replica set member (default 27018, as compose.yaml)
 *   MDA_MONGO_URI_FILE  where to write the URI once ready
 *   MONGOMS_DOWNLOAD_DIR  mongod binary cache (default <os tmpdir>/mongodb-binaries — kept out of
 *                         node_modules/.cache, see the cache-poisoning note in .circleci/config.yml)
 *
 * Usage: node scripts/cloud-mongo.cjs
 */

'use strict';

const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');

const PORT = Number(process.env.MDA_MONGO_PORT || 27018);
const URI_FILE = process.env.MDA_MONGO_URI_FILE || path.join(os.tmpdir(), 'mda-mongo-uri');
const DB_NAME = 'dam-db';

process.env.MONGOMS_DOWNLOAD_DIR = process.env.MONGOMS_DOWNLOAD_DIR || path.join(os.tmpdir(), 'mongodb-binaries');

const isPortOpen = (port) =>
  new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });

async function main() {
  if (fs.existsSync(URI_FILE) && (await isPortOpen(PORT))) {
    console.log(`[cloud-mongo] already running: ${fs.readFileSync(URI_FILE, 'utf8').trim()}`);
    return;
  }

  // Stale URI file from a dead previous run: remove it so waiters don't pick it up too early.
  fs.rmSync(URI_FILE, { force: true });

  const { MongoMemoryReplSet } = require('mongodb-memory-server');

  const replSet = await MongoMemoryReplSet.create({
    replSet: { name: 'rs0', count: 1, storageEngine: 'wiredTiger' },
    instanceOpts: [{ port: PORT, ip: '127.0.0.1' }],
  });
  await replSet.waitUntilRunning();

  const uri = replSet.getUri(DB_NAME);
  fs.writeFileSync(URI_FILE, `${uri}\n`);
  console.log(`[cloud-mongo] ready: ${uri}`);

  const stop = async () => {
    fs.rmSync(URI_FILE, { force: true });
    await replSet.stop();
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  // Keep the event loop alive for as long as the session lasts.
  setInterval(() => {}, 1 << 30);
}

main().catch((error) => {
  console.error('[cloud-mongo] failed to start:', error);
  process.exit(1);
});
