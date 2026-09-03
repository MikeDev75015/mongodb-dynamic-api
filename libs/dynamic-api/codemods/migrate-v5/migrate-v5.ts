import { ImportDeclaration, Project, SourceFile, SyntaxKind } from 'ts-morph';
import { REMOVED_SYMBOLS } from './removed-symbols';

/**
 * Result of migrating (or attempting to migrate) a single source file.
 */
interface FileMigrationResult {
  filePath: string;
  changed: boolean;
  /** Human-readable descriptions of changes actually applied. */
  fixes: string[];
  /** Things the tool could not safely auto-fix — need manual review. */
  warnings: string[];
}

/**
 * Aggregate result of a full `migrateV5` run.
 */
interface MigrationReport {
  filesScanned: number;
  filesChanged: number;
  results: FileMigrationResult[];
}

const PACKAGE_NAME = 'mongodb-dynamic-api';

function findImport(sourceFile: SourceFile, moduleSpecifier: string): ImportDeclaration | undefined {
  return sourceFile
    .getImportDeclarations()
    .find((declaration) => declaration.getModuleSpecifierValue() === moduleSpecifier);
}

/**
 * Adds a named import, creating the import declaration if it does not exist yet. Re-resolves the
 * declaration by module specifier rather than taking a node reference, so it is always safe to
 * call even right after a `removeNamedImport` call may have deleted the whole declaration.
 */
function addNamedImport(sourceFile: SourceFile, moduleSpecifier: string, name: string): void {
  const importDeclaration =
    findImport(sourceFile, moduleSpecifier) ??
    sourceFile.addImportDeclaration({ moduleSpecifier, namedImports: [] });

  const alreadyImported = importDeclaration
    .getNamedImports()
    .some((namedImport) => namedImport.getName() === name);

  if (!alreadyImported) {
    importDeclaration.addNamedImport(name);
  }
}

/**
 * Removes a single named import, deleting the whole import declaration if it becomes empty.
 * Re-resolves the declaration by module specifier internally (a no-op if it is not found) rather
 * than taking a node reference, so it is always safe to call — including a second time right
 * after a prior call already removed the declaration.
 */
function removeNamedImport(sourceFile: SourceFile, moduleSpecifier: string, name: string): void {
  const importDeclaration = findImport(sourceFile, moduleSpecifier);

  if (!importDeclaration) {
    return;
  }

  const namedImport = importDeclaration
    .getNamedImports()
    .find((specifier) => specifier.getName() === name);

  namedImport?.remove();

  const hasNoImportsLeft =
    importDeclaration.getNamedImports().length === 0 &&
    !importDeclaration.getDefaultImport() &&
    !importDeclaration.getNamespaceImport();

  if (hasNoImportsLeft) {
    importDeclaration.remove();
  }
}

/**
 * Transform 1 — `DynamicApiGlobalStateService.getEntityModel(Entity)` is renamed to the new,
 * narrow `DynamicApiEntityService.getModel(Entity)` (both static, same signature). Any OTHER
 * member accessed on `DynamicApiGlobalStateService` (it has no replacement beyond
 * `getEntityModel`) is left untouched and reported for manual review.
 */
function migrateGlobalStateService(sourceFile: SourceFile): FileMigrationResult {
  const filePath = sourceFile.getFilePath();
  const fixes: string[] = [];
  const warnings: string[] = [];

  const importDeclaration = findImport(sourceFile, PACKAGE_NAME);
  const namedImport = importDeclaration
    ?.getNamedImports()
    .find((specifier) => specifier.getName() === 'DynamicApiGlobalStateService');

  if (!importDeclaration || !namedImport) {
    return { filePath, changed: false, fixes, warnings };
  }

  if (namedImport.getAliasNode()) {
    warnings.push(
      "imports DynamicApiGlobalStateService under an alias ('as ...') — not auto-migrated, rename its usages to DynamicApiEntityService.getModel() manually.",
    );
    return { filePath, changed: false, fixes, warnings };
  }

  const propertyAccesses = sourceFile
    .getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
    .filter((node) => node.getExpression().getText() === 'DynamicApiGlobalStateService');

  const safeAccesses = propertyAccesses.filter((node) => node.getName() === 'getEntityModel');
  const unsafeAccesses = propertyAccesses.filter((node) => node.getName() !== 'getEntityModel');

  for (const access of unsafeAccesses) {
    warnings.push(
      `line ${access.getStartLineNumber()}: DynamicApiGlobalStateService.${access.getName()}() has no direct v5 replacement — review manually.`,
    );
  }

  const otherReferences = sourceFile
    .getDescendantsOfKind(SyntaxKind.Identifier)
    .filter(
      (node) =>
        node.getText() === 'DynamicApiGlobalStateService' &&
        !node.getFirstAncestorByKind(SyntaxKind.ImportSpecifier) &&
        !propertyAccesses.some((access) => access.getExpression() === node),
    );

  for (const reference of otherReferences) {
    warnings.push(
      `line ${reference.getStartLineNumber()}: DynamicApiGlobalStateService is referenced directly (not as a static member access) — review manually, it is no longer exported in v5.`,
    );
  }

  for (const access of safeAccesses) {
    access.getExpression().replaceWithText('DynamicApiEntityService');
    access.getNameNode().replaceWithText('getModel');
    fixes.push(
      `line ${access.getStartLineNumber()}: renamed DynamicApiGlobalStateService.getEntityModel(...) to DynamicApiEntityService.getModel(...).`,
    );
  }

  const totalUsages = propertyAccesses.length + otherReferences.length;

  if (totalUsages === 0) {
    removeNamedImport(sourceFile, PACKAGE_NAME, 'DynamicApiGlobalStateService');
    fixes.push('removed the now-unused import of DynamicApiGlobalStateService (no longer exported in v5).');
  } else if (unsafeAccesses.length === 0 && otherReferences.length === 0) {
    // Add the new import before removing the old one — removing it first could delete the whole
    // (now-empty) import declaration, invalidating any node reference this function still holds.
    addNamedImport(sourceFile, PACKAGE_NAME, 'DynamicApiEntityService');
    removeNamedImport(sourceFile, PACKAGE_NAME, 'DynamicApiGlobalStateService');
  } else if (safeAccesses.length > 0) {
    // Some usages were fixed, but at least one remaining usage has no replacement — the file
    // still won't compile against v5 regardless, so keep the (now broken) old import next to the
    // new one rather than silently removing something a warning still points at.
    addNamedImport(sourceFile, PACKAGE_NAME, 'DynamicApiEntityService');
  }

  return { filePath, changed: fixes.length > 0, fixes, warnings };
}

/**
 * Transform 2 — the old stacked `@DynamicApiSchemaOptions(...)`/`@DynamicAPISchemaOptions(...)` +
 * `@Schema(...)` pair on an entity class is merged into a single `@DynamicApiSchema(...)` call,
 * combining both option objects. Only handles plain object-literal arguments (or no argument at
 * all) — anything else is reported for manual review rather than guessed at.
 */
function migrateSchemaDecorators(sourceFile: SourceFile): FileMigrationResult {
  const filePath = sourceFile.getFilePath();
  const fixes: string[] = [];
  const warnings: string[] = [];
  let mergedAtLeastOne = false;

  for (const classDeclaration of sourceFile.getClasses()) {
    const decorators = classDeclaration.getDecorators();
    const mdaDecorator = decorators.find((decorator) =>
      ['DynamicApiSchemaOptions', 'DynamicAPISchemaOptions'].includes(decorator.getName()),
    );

    if (!mdaDecorator) {
      continue;
    }

    const mongooseDecorator = decorators.find((decorator) => decorator.getName() === 'Schema');
    const mdaArgs = mdaDecorator.getArguments();
    const mongooseArgs = mongooseDecorator?.getArguments() ?? [];
    const mdaObjectLiteral = mdaArgs[0]?.asKind(SyntaxKind.ObjectLiteralExpression);
    const mongooseObjectLiteral = mongooseArgs[0]?.asKind(SyntaxKind.ObjectLiteralExpression);

    if (mdaArgs.length > 0 && !mdaObjectLiteral) {
      warnings.push(
        `line ${mdaDecorator.getStartLineNumber()}: @${mdaDecorator.getName()}'s argument is not a plain object literal — merge it with @Schema into @DynamicApiSchema manually.`,
      );
      continue;
    }

    if (mongooseArgs.length > 0 && !mongooseObjectLiteral) {
      warnings.push(
        `line ${mongooseDecorator!.getStartLineNumber()}: @Schema's argument is not a plain object literal — merge it with @${mdaDecorator.getName()} into @DynamicApiSchema manually.`,
      );
      continue;
    }

    const mongooseProps = mongooseObjectLiteral?.getProperties().map((property) => property.getText()) ?? [];
    const mdaProps = mdaObjectLiteral?.getProperties().map((property) => property.getText()) ?? [];
    const mergedProps = [...mongooseProps, ...mdaProps];
    const mergedArgumentText =
      mergedProps.length > 0 ? `{\n  ${mergedProps.join(',\n  ')},\n}` : '{}';

    const className = classDeclaration.getName() ?? '<anonymous>';
    const line = mdaDecorator.getStartLineNumber();
    const mdaDecoratorName = mdaDecorator.getName();

    mdaDecorator.remove();
    mongooseDecorator?.remove();
    classDeclaration.insertDecorator(0, { name: 'DynamicApiSchema', arguments: [mergedArgumentText] });

    fixes.push(`line ${line}: merged @${mdaDecoratorName} + @Schema into @DynamicApiSchema on class ${className}.`);
    mergedAtLeastOne = true;
  }

  if (!mergedAtLeastOne) {
    return { filePath, changed: false, fixes, warnings };
  }

  const stillUsesMongooseSchema = sourceFile
    .getClasses()
    .some((classDeclaration) => classDeclaration.getDecorators().some((decorator) => decorator.getName() === 'Schema'));

  if (!stillUsesMongooseSchema) {
    removeNamedImport(sourceFile, '@nestjs/mongoose', 'Schema');
  }

  // Add the new import before removing the old ones — removing the last named import from the
  // package's import declaration deletes the whole declaration, which would invalidate a node
  // reference held across these calls.
  addNamedImport(sourceFile, PACKAGE_NAME, 'DynamicApiSchema');
  removeNamedImport(sourceFile, PACKAGE_NAME, 'DynamicApiSchemaOptions');
  removeNamedImport(sourceFile, PACKAGE_NAME, 'DynamicAPISchemaOptions');

  sourceFile.formatText({ indentSize: 2 });

  // Removing two stacked decorators one at a time can leave behind their now-empty lines —
  // formatText() re-indents but does not collapse blank lines, so do that as plain text.
  sourceFile.replaceWithText(sourceFile.getFullText().replace(/\n{3,}/g, '\n\n'));

  return { filePath, changed: true, fixes, warnings };
}

/**
 * Report-only scan for symbols removed in v5 that have no direct, mechanical replacement — these
 * can only be flagged for manual review, never auto-fixed.
 */
function scanForRemovedSymbols(sourceFile: SourceFile): FileMigrationResult {
  const filePath = sourceFile.getFilePath();
  const warnings: string[] = [];

  const importDeclaration = findImport(sourceFile, PACKAGE_NAME);
  if (!importDeclaration) {
    return { filePath, changed: false, fixes: [], warnings };
  }

  const importedNames = new Set(importDeclaration.getNamedImports().map((specifier) => specifier.getName()));

  for (const removed of REMOVED_SYMBOLS) {
    if (importedNames.has(removed.name)) {
      warnings.push(`imports '${removed.name}', which is no longer exported in v5 — ${removed.guidance}`);
    }
  }

  return { filePath, changed: false, fixes: [], warnings };
}

/**
 * Runs every v5 migration transform against a single already-loaded ts-morph `SourceFile`,
 * merging their results. Exposed separately from `migrateV5` so tests can exercise the actual
 * transform logic against an in-memory project, with no real file I/O involved.
 */
function migrateSourceFile(sourceFile: SourceFile): FileMigrationResult {
  const results = [
    migrateGlobalStateService(sourceFile),
    migrateSchemaDecorators(sourceFile),
    scanForRemovedSymbols(sourceFile),
  ];

  return {
    filePath: sourceFile.getFilePath(),
    changed: results.some((result) => result.changed),
    fixes: results.flatMap((result) => result.fixes),
    warnings: results.flatMap((result) => result.warnings),
  };
}

/**
 * Migrates every `.ts` file under `rootDir` (excluding `node_modules`, declaration files and spec
 * files) from `mongodb-dynamic-api` v4 usage patterns to their v5 equivalents, in place.
 *
 * @param {string} rootDir - Directory to scan recursively for `.ts` files.
 * @param {{ dryRun?: boolean }} [options] - Set `dryRun: true` to compute the report without
 * writing any file changes to disk.
 * @returns {MigrationReport} A summary of every file scanned, what was fixed, and what needs
 * manual review.
 *
 * @example
 * ```typescript
 * import { migrateV5 } from 'mongodb-dynamic-api/codemods/migrate-v5';
 *
 * const report = migrateV5('./src');
 * console.log(`${report.filesChanged}/${report.filesScanned} files updated`);
 * ```
 */
function migrateV5(rootDir: string, options: { dryRun?: boolean } = {}): MigrationReport {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  project.addSourceFilesAtPaths([
    `${rootDir}/**/*.ts`,
    `!${rootDir}/**/*.d.ts`,
    `!${rootDir}/**/*.spec.ts`,
    `!${rootDir}/**/node_modules/**`,
  ]);

  const results = project.getSourceFiles().map((sourceFile) => migrateSourceFile(sourceFile));

  if (!options.dryRun) {
    project.saveSync();
  }

  return {
    filesScanned: results.length,
    filesChanged: results.filter((result) => result.changed).length,
    results,
  };
}

export { migrateV5, migrateSourceFile };
export type { FileMigrationResult, MigrationReport };
