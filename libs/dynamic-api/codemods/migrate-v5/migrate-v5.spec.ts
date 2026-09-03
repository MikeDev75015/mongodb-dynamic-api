import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Project, SourceFile } from 'ts-morph';
import { afterEach, describe, expect, it } from 'vitest';
import { migrateSourceFile, migrateV5 } from './migrate-v5';

function createFile(text: string): SourceFile {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile('entity.ts', text);
}

describe('migrateSourceFile', () => {
  describe('DynamicApiGlobalStateService -> DynamicApiEntityService', () => {
    it('leaves a file untouched when the service is not imported', () => {
      const file = createFile(`export class Foo {}`);

      const result = migrateSourceFile(file);

      expect(result.changed).toBe(false);
      expect(result.fixes).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('removes a now-unused import with no usages left', () => {
      const file = createFile(
        `import { DynamicApiGlobalStateService } from 'mongodb-dynamic-api';\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.changed).toBe(true);
      expect(result.fixes).toEqual([
        'removed the now-unused import of DynamicApiGlobalStateService (no longer exported in v5).',
      ]);
      expect(file.getFullText()).not.toContain('DynamicApiGlobalStateService');
    });

    it('warns and skips an aliased import instead of guessing', () => {
      const file = createFile(
        `import { DynamicApiGlobalStateService as GSS } from 'mongodb-dynamic-api';\nGSS.getEntityModel(Foo);\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.changed).toBe(false);
      expect(result.warnings).toEqual([
        "imports DynamicApiGlobalStateService under an alias ('as ...') — not auto-migrated, rename its usages to DynamicApiEntityService.getModel() manually.",
      ]);
    });

    it('renames a single getEntityModel call and swaps the import', () => {
      const file = createFile(
        `import { DynamicApiGlobalStateService } from 'mongodb-dynamic-api';\n\nasync function load() {\n  return DynamicApiGlobalStateService.getEntityModel(Foo);\n}\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.changed).toBe(true);
      expect(result.fixes.some((fix) => fix.includes('renamed DynamicApiGlobalStateService.getEntityModel'))).toBe(true);
      expect(file.getFullText()).toContain('DynamicApiEntityService.getModel(Foo)');
      expect(file.getFullText()).not.toContain('DynamicApiGlobalStateService');
      expect(file.getFullText()).toMatch(/import \{ DynamicApiEntityService \} from 'mongodb-dynamic-api';/);
    });

    it('renames every getEntityModel call site without duplicating the import', () => {
      const file = createFile(
        `import { DynamicApiGlobalStateService } from 'mongodb-dynamic-api';\n\nDynamicApiGlobalStateService.getEntityModel(Foo);\nDynamicApiGlobalStateService.getEntityModel(Bar);\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.fixes).toHaveLength(2);
      expect(file.getFullText().match(/DynamicApiEntityService/g)).toHaveLength(3);
    });

    it('fixes safe call sites, warns on unsafe ones, and keeps the broken import alongside the new one', () => {
      const file = createFile(
        `import { DynamicApiGlobalStateService } from 'mongodb-dynamic-api';\n\nDynamicApiGlobalStateService.getEntityModel(Foo);\nDynamicApiGlobalStateService.getValue('initialized');\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.fixes.some((fix) => fix.includes('getEntityModel'))).toBe(true);
      expect(result.warnings).toEqual([
        expect.stringContaining("DynamicApiGlobalStateService.getValue() has no direct v5 replacement"),
      ]);
      expect(file.getFullText()).toContain('DynamicApiGlobalStateService');
      expect(file.getFullText()).toContain('DynamicApiEntityService');
    });

    it('only warns, with zero fixes, when every member access is unsafe', () => {
      const file = createFile(
        `import { DynamicApiGlobalStateService } from 'mongodb-dynamic-api';\n\nDynamicApiGlobalStateService.getValue('initialized');\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.changed).toBe(false);
      expect(result.fixes).toEqual([]);
      expect(result.warnings).toHaveLength(1);
    });

    it('warns about a bare identifier reference that is not a member access', () => {
      const file = createFile(
        `import { DynamicApiGlobalStateService } from 'mongodb-dynamic-api';\n\nconst ref = DynamicApiGlobalStateService;\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.changed).toBe(false);
      expect(result.warnings).toEqual([
        expect.stringContaining('is referenced directly (not as a static member access)'),
      ]);
    });

    it('does not duplicate the import when DynamicApiEntityService is already imported', () => {
      const file = createFile(
        `import { DynamicApiEntityService, DynamicApiGlobalStateService } from 'mongodb-dynamic-api';\n\nDynamicApiGlobalStateService.getEntityModel(Foo);\n`,
      );

      migrateSourceFile(file);

      expect(file.getFullText().match(/DynamicApiEntityService/g)).toHaveLength(2);
    });
  });

  describe('@DynamicApiSchemaOptions + @Schema -> @DynamicApiSchema', () => {
    it('merges both decorators into one, preserving mongoose options first then MDA options', () => {
      const file = createFile(
        `import { Prop, Schema } from '@nestjs/mongoose';\nimport { BaseEntity, DynamicApiSchemaOptions } from 'mongodb-dynamic-api';\n\n@DynamicApiSchemaOptions({\n  indexes: [{ fields: { email: 1 }, options: { unique: true } }],\n})\n@Schema({ collection: 'users' })\nexport class User extends BaseEntity {\n  @Prop() email: string;\n}\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.fixes.some((fix) => fix.includes('merged @DynamicApiSchemaOptions + @Schema'))).toBe(true);
      const text = file.getFullText();
      expect(text).toContain('@DynamicApiSchema({');
      expect(text).toContain("collection: 'users'");
      expect(text).toContain('indexes: [{ fields: { email: 1 }, options: { unique: true } }]');
      expect(text).not.toMatch(/@Schema\(/);
      expect(text).not.toContain('DynamicApiSchemaOptions');
      expect(text).toMatch(/import \{ Prop \} from '@nestjs\/mongoose';/);
      expect(text).toMatch(/DynamicApiSchema/);
    });

    it('recognizes the deprecated all-caps DynamicAPISchemaOptions spelling', () => {
      const file = createFile(
        `import { Schema } from '@nestjs/mongoose';\nimport { BaseEntity, DynamicAPISchemaOptions } from 'mongodb-dynamic-api';\n\n@DynamicAPISchemaOptions({})\n@Schema({ collection: 'users' })\nexport class User extends BaseEntity {}\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.changed).toBe(true);
      expect(file.getFullText()).toContain('@DynamicApiSchema(');
      expect(file.getFullText()).not.toContain('DynamicAPISchemaOptions');
    });

    it('drops an empty MDA options object, keeping only the mongoose options', () => {
      const file = createFile(
        `import { Schema } from '@nestjs/mongoose';\nimport { BaseEntity, DynamicApiSchemaOptions } from 'mongodb-dynamic-api';\n\n@DynamicApiSchemaOptions({})\n@Schema({ collection: 'users' })\nexport class User extends BaseEntity {}\n`,
      );

      migrateSourceFile(file);

      expect(file.getFullText()).toContain("@DynamicApiSchema({\n  collection: 'users',\n})");
    });

    it('warns and leaves both decorators untouched when the MDA argument is not an object literal', () => {
      const file = createFile(
        `import { Schema } from '@nestjs/mongoose';\nimport { BaseEntity, DynamicApiSchemaOptions } from 'mongodb-dynamic-api';\n\nconst opts = { indexes: [] };\n\n@DynamicApiSchemaOptions(opts)\n@Schema({ collection: 'users' })\nexport class User extends BaseEntity {}\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.changed).toBe(false);
      expect(result.warnings).toEqual([expect.stringContaining("argument is not a plain object literal")]);
      expect(file.getFullText()).toContain('@DynamicApiSchemaOptions(opts)');
      expect(file.getFullText()).toContain('@Schema({ collection');
    });

    it('warns and leaves both decorators untouched when the mongoose argument is not an object literal', () => {
      const file = createFile(
        `import { Schema } from '@nestjs/mongoose';\nimport { BaseEntity, DynamicApiSchemaOptions } from 'mongodb-dynamic-api';\n\nconst opts = { collection: 'users' };\n\n@DynamicApiSchemaOptions({})\n@Schema(opts)\nexport class User extends BaseEntity {}\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.changed).toBe(false);
      expect(result.warnings).toEqual([expect.stringContaining("@Schema's argument is not a plain object literal")]);
    });

    it('merges when the MDA decorator is called with no arguments at all', () => {
      const file = createFile(
        `import { Schema } from '@nestjs/mongoose';\nimport { BaseEntity, DynamicApiSchemaOptions } from 'mongodb-dynamic-api';\n\n@DynamicApiSchemaOptions()\n@Schema({ collection: 'users' })\nexport class User extends BaseEntity {}\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.changed).toBe(true);
      expect(file.getFullText()).toContain("@DynamicApiSchema({\n  collection: 'users',\n})");
    });

    it('falls back to a placeholder name when the decorated class is anonymous', () => {
      const file = createFile(
        `import { Schema } from '@nestjs/mongoose';\nimport { BaseEntity, DynamicApiSchemaOptions } from 'mongodb-dynamic-api';\n\n@DynamicApiSchemaOptions({})\n@Schema({ collection: 'users' })\nexport default class extends BaseEntity {}\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.fixes.some((fix) => fix.includes('<anonymous>'))).toBe(true);
    });

    it('merges down to an empty object literal when neither decorator has any properties', () => {
      const file = createFile(
        `import { Schema } from '@nestjs/mongoose';\nimport { BaseEntity, DynamicApiSchemaOptions } from 'mongodb-dynamic-api';\n\n@DynamicApiSchemaOptions({})\n@Schema()\nexport class User extends BaseEntity {}\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.changed).toBe(true);
      expect(file.getFullText()).toContain('@DynamicApiSchema({})');
    });

    it('merges when there is no @Schema decorator at all', () => {
      const file = createFile(
        `import { BaseEntity, DynamicApiSchemaOptions } from 'mongodb-dynamic-api';\n\n@DynamicApiSchemaOptions({ indexes: [{ fields: { email: 1 } }] })\nexport class User extends BaseEntity {}\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.changed).toBe(true);
      expect(file.getFullText()).toContain('@DynamicApiSchema({');
      expect(file.getFullText()).toContain('indexes: [{ fields: { email: 1 } }]');
    });

    it('only migrates the class that uses the stacked pair, keeping @Schema-only classes and their import intact', () => {
      const file = createFile(
        `import { Schema } from '@nestjs/mongoose';\nimport { BaseEntity, DynamicApiSchemaOptions } from 'mongodb-dynamic-api';\n\n@DynamicApiSchemaOptions({})\n@Schema({ collection: 'users' })\nexport class User extends BaseEntity {}\n\n@Schema({ collection: 'products' })\nexport class Product extends BaseEntity {}\n`,
      );

      migrateSourceFile(file);

      const text = file.getFullText();
      expect(text).toContain('@DynamicApiSchema({');
      expect(text).toMatch(/@Schema\(\{ collection: 'products' \}\)/);
      expect(text).toMatch(/import \{ Schema \} from '@nestjs\/mongoose';/);
    });

    it('keeps the package import declaration when it still has other named imports', () => {
      const file = createFile(
        `import { Schema } from '@nestjs/mongoose';\nimport { BaseEntity, DynamicApiSchemaOptions } from 'mongodb-dynamic-api';\n\n@DynamicApiSchemaOptions({})\n@Schema({ collection: 'users' })\nexport class User extends BaseEntity {}\n`,
      );

      migrateSourceFile(file);

      const importLine = file.getImportDeclarations().find((d) => d.getModuleSpecifierValue() === 'mongodb-dynamic-api');
      expect(importLine?.getNamedImports().map((n) => n.getName())).toEqual(
        expect.arrayContaining(['BaseEntity', 'DynamicApiSchema']),
      );
    });

    it('re-creates the package import declaration when removing the old name empties it', () => {
      const file = createFile(
        `import { Schema } from '@nestjs/mongoose';\nimport { DynamicApiSchemaOptions } from 'mongodb-dynamic-api';\n\n@DynamicApiSchemaOptions({})\n@Schema({ collection: 'users' })\nexport class User {}\n`,
      );

      migrateSourceFile(file);

      const importLines = file.getImportDeclarations().filter((d) => d.getModuleSpecifierValue() === 'mongodb-dynamic-api');
      expect(importLines).toHaveLength(1);
      expect(importLines[0].getNamedImports().map((n) => n.getName())).toEqual(['DynamicApiSchema']);
    });

    it('adds a fresh package import when none existed', () => {
      const file = createFile(
        `import { Schema } from '@nestjs/mongoose';\n\nconst DynamicApiSchemaOptions = (opts: object) => (target: object) => undefined;\n\n@DynamicApiSchemaOptions({})\n@Schema({ collection: 'users' })\nclass User {}\n`,
      );

      migrateSourceFile(file);

      const importLine = file.getImportDeclarations().find((d) => d.getModuleSpecifierValue() === 'mongodb-dynamic-api');
      expect(importLine?.getNamedImports().map((n) => n.getName())).toEqual(['DynamicApiSchema']);
    });
  });

  describe('simple verbose/all-caps renames', () => {
    it('renames a type-only alias and its import', () => {
      const file = createFile(
        `import { BaseEntity, DynamicAPIRouteConfig } from 'mongodb-dynamic-api';\n\nconst cfg: DynamicAPIRouteConfig<BaseEntity> = {} as any;\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.fixes.some((fix) => fix.includes('renamed DynamicAPIRouteConfig to DynamicApiRouteConfig'))).toBe(true);
      const text = file.getFullText();
      expect(text).toContain('DynamicApiRouteConfig<BaseEntity>');
      expect(text).not.toContain('DynamicAPIRouteConfig');
    });

    it('renames every matching usage without duplicating the import', () => {
      const file = createFile(
        `import { DynamicApiServiceCallback } from 'mongodb-dynamic-api';\n\ntype A = DynamicApiServiceCallback<any>;\ntype B = DynamicApiServiceCallback<any>;\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.fixes.some((fix) => fix.includes('2 usage(s)'))).toBe(true);
      expect(file.getFullText().match(/AfterSaveCallback/g)).toHaveLength(3);
    });

    it('renames multiple different aliases in the same file', () => {
      const file = createFile(
        `import { DynamicApiCallbackMethods, DynamicAPIServiceProvider } from 'mongodb-dynamic-api';\n\ntype A = DynamicApiCallbackMethods;\ntype B = DynamicAPIServiceProvider;\n`,
      );

      migrateSourceFile(file);

      const text = file.getFullText();
      expect(text).toContain('type A = CallbackMethods;');
      expect(text).toContain('type B = DynamicApiServiceProvider;');
    });

    it('leaves the file untouched when none of the renamed aliases are imported', () => {
      const file = createFile(`import { BaseEntity } from 'mongodb-dynamic-api';\n`);

      const result = migrateSourceFile(file);

      expect(result.fixes).toEqual([]);
    });

    it('warns and skips an aliased import instead of guessing', () => {
      const file = createFile(
        `import { DynamicAPIRouteConfig as Cfg } from 'mongodb-dynamic-api';\n\ntype A = Cfg<any>;\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.warnings).toEqual([
        expect.stringContaining("imports DynamicAPIRouteConfig under an alias ('as ...')"),
      ]);
      expect(file.getFullText()).toContain('DynamicAPIRouteConfig as Cfg');
    });
  });

  describe('enableDynamicAPIWebSockets numeric-overload removal', () => {
    it('rewrites a numeric-literal second argument to the options-object form', () => {
      const file = createFile(
        `import { enableDynamicAPIWebSockets } from 'mongodb-dynamic-api';\n\nenableDynamicAPIWebSockets(app, 50);\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.fixes.some((fix) => fix.includes('options-object form'))).toBe(true);
      expect(file.getFullText()).toContain('enableDynamicAPIWebSockets(app, { maxListeners: 50 });');
    });

    it('leaves an already-correct options-object call untouched', () => {
      const file = createFile(
        `import { enableDynamicAPIWebSockets } from 'mongodb-dynamic-api';\n\nenableDynamicAPIWebSockets(app, { maxListeners: 50 });\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.fixes).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('warns instead of guessing when the second argument is not a literal', () => {
      const file = createFile(
        `import { enableDynamicAPIWebSockets } from 'mongodb-dynamic-api';\n\ndeclare const n: number;\nenableDynamicAPIWebSockets(app, n);\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.fixes).toEqual([]);
      expect(result.warnings).toEqual([
        expect.stringContaining("second argument is not a plain number literal"),
      ]);
    });

    it('ignores a single-argument call', () => {
      const file = createFile(
        `import { enableDynamicAPIWebSockets } from 'mongodb-dynamic-api';\n\nenableDynamicAPIWebSockets(app);\n`,
      );

      const result = migrateSourceFile(file);

      expect(result.fixes).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('removed-symbols report', () => {
    it('produces no warning when nothing removed is imported', () => {
      const file = createFile(`import { BaseEntity } from 'mongodb-dynamic-api';\n`);

      const result = migrateSourceFile(file);

      expect(result.warnings).toEqual([]);
    });

    it('flags an import of a symbol with no direct replacement', () => {
      const file = createFile(`import { BaseService } from 'mongodb-dynamic-api';\n`);

      const result = migrateSourceFile(file);

      expect(result.warnings).toEqual([expect.stringContaining("imports 'BaseService'")]);
    });

    it('flags AnyBeforeSaveCallback (no successor to rename to)', () => {
      const file = createFile(`import { AnyBeforeSaveCallback } from 'mongodb-dynamic-api';\n`);

      const result = migrateSourceFile(file);

      expect(result.warnings).toEqual([expect.stringContaining("imports 'AnyBeforeSaveCallback'")]);
    });
  });
});

describe('migrateV5', () => {
  let dir: string;

  afterEach(() => {
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('scans, fixes and writes real files under a directory', () => {
    dir = mkdtempSync(join(tmpdir(), 'migrate-v5-'));
    const filePath = join(dir, 'user.entity.ts');
    writeFileSync(
      filePath,
      `import { DynamicApiGlobalStateService } from 'mongodb-dynamic-api';\n\nDynamicApiGlobalStateService.getEntityModel(Foo);\n`,
    );

    const report = migrateV5(dir);

    expect(report.filesScanned).toBe(1);
    expect(report.filesChanged).toBe(1);
    expect(readFileSync(filePath, 'utf-8')).toContain('DynamicApiEntityService.getModel(Foo)');
  });

  it('does not write anything to disk in dry-run mode', () => {
    dir = mkdtempSync(join(tmpdir(), 'migrate-v5-'));
    const filePath = join(dir, 'user.entity.ts');
    const original = `import { DynamicApiGlobalStateService } from 'mongodb-dynamic-api';\n\nDynamicApiGlobalStateService.getEntityModel(Foo);\n`;
    writeFileSync(filePath, original);

    const report = migrateV5(dir, { dryRun: true });

    expect(report.filesChanged).toBe(1);
    expect(readFileSync(filePath, 'utf-8')).toBe(original);
  });

  it('excludes *.spec.ts files from the scan', () => {
    dir = mkdtempSync(join(tmpdir(), 'migrate-v5-'));
    writeFileSync(
      join(dir, 'user.spec.ts'),
      `import { DynamicApiGlobalStateService } from 'mongodb-dynamic-api';\n`,
    );

    const report = migrateV5(dir);

    expect(report.filesScanned).toBe(0);
  });
});
