import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MigrationReport } from './migrate-v5';

const migrateV5Mock = vi.fn<(rootDir: string, options?: { dryRun?: boolean }) => MigrationReport>();

vi.mock('./migrate-v5', () => ({
  migrateV5: (rootDir: string, options?: { dryRun?: boolean }) => migrateV5Mock(rootDir, options),
}));

describe('migrate-v5 cli', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.resetModules();
    migrateV5Mock.mockReset();
    process.exitCode = undefined;
  });

  it('prints usage and exits non-zero when no path is given', async () => {
    const { run } = await import('./cli');

    run(['migrate-v5']);

    expect(process.exitCode).toBe(1);
    expect(migrateV5Mock).not.toHaveBeenCalled();
  });

  it('prints usage and exits non-zero for an unknown command', async () => {
    const { run } = await import('./cli');

    run(['not-a-real-command', './src']);

    expect(process.exitCode).toBe(1);
    expect(migrateV5Mock).not.toHaveBeenCalled();
  });

  it('reports success with no exit code change when nothing needs manual review', async () => {
    migrateV5Mock.mockReturnValue({
      filesScanned: 2,
      filesChanged: 1,
      results: [
        { filePath: 'a.ts', changed: true, fixes: ['did a thing'], warnings: [] },
        { filePath: 'b.ts', changed: false, fixes: [], warnings: [] },
      ],
    });

    const { run } = await import('./cli');

    run(['migrate-v5', './src']);

    expect(migrateV5Mock).toHaveBeenCalledWith('./src', { dryRun: false });
    expect(process.exitCode).toBeUndefined();
    expect(logSpy.mock.calls.flat().join('\n')).toContain('did a thing');
  });

  it('sets a non-zero exit code and prints warnings when manual review is needed', async () => {
    migrateV5Mock.mockReturnValue({
      filesScanned: 1,
      filesChanged: 0,
      results: [{ filePath: 'a.ts', changed: false, fixes: [], warnings: ['needs a look'] }],
    });

    const { run } = await import('./cli');

    run(['migrate-v5', './src']);

    expect(process.exitCode).toBe(1);
    expect(logSpy.mock.calls.flat().join('\n')).toContain('needs a look');
  });

  it('passes --dry-run through to migrateV5', async () => {
    migrateV5Mock.mockReturnValue({ filesScanned: 0, filesChanged: 0, results: [] });

    const { run } = await import('./cli');

    run(['migrate-v5', './src', '--dry-run']);

    expect(migrateV5Mock).toHaveBeenCalledWith('./src', { dryRun: true });
  });
});
