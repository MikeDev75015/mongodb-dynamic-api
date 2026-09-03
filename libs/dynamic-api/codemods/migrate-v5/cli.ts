#!/usr/bin/env node
import { migrateV5 } from './migrate-v5';

/**
 * `npx mongodb-dynamic-api migrate-v5 <path> [--dry-run]`
 *
 * Thin CLI wrapper around `migrateV5` — parses argv, prints a human-readable report, and sets a
 * non-zero exit code when anything was left for manual review, so it can be wired into CI.
 */
function run(argv: string[]): void {
  const [command, targetPath, ...rest] = argv;

  if (command !== 'migrate-v5' || !targetPath) {
    console.log('Usage: npx mongodb-dynamic-api migrate-v5 <path> [--dry-run]');
    process.exitCode = 1;
    return;
  }

  const dryRun = rest.includes('--dry-run');
  const report = migrateV5(targetPath, { dryRun });

  console.log(`\nmongodb-dynamic-api migrate-v5${dryRun ? ' (dry run)' : ''}`);
  console.log(`Scanned ${report.filesScanned} file(s), changed ${report.filesChanged}.\n`);

  let warningCount = 0;

  for (const result of report.results) {
    if (result.fixes.length === 0 && result.warnings.length === 0) {
      continue;
    }

    console.log(result.filePath);
    result.fixes.forEach((fix) => console.log(`  ✓ ${fix}`));
    result.warnings.forEach((warning) => console.log(`  ⚠ ${warning}`));
    warningCount += result.warnings.length;
  }

  if (warningCount > 0) {
    console.log(`\n${warningCount} item(s) need manual review — see the ⚠ lines above.`);
    process.exitCode = 1;
  } else {
    console.log('\nNo manual review needed.');
  }
}

/* istanbul ignore next -- exercised via the compiled bin script, not by unit tests */
if (require.main === module) {
  run(process.argv.slice(2));
}

export { run };
