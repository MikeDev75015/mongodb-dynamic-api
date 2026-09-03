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

/**
 * Returns every `import ... from moduleSpecifier` declaration in the file — a source file can
 * (and, in practice, does) import from the same module through more than one separate `import`
 * statement (e.g. a `import type { ... }` alongside a value `import { ... }`). Only checking the
 * first match (as a plain `.find()` would) silently misses named imports that live in a later
 * declaration — see `findNamedImport` below, which is why every lookup goes through this.
 */
function findImports(sourceFile: SourceFile, moduleSpecifier: string): ImportDeclaration[] {
  return sourceFile
    .getImportDeclarations()
    .filter((declaration) => declaration.getModuleSpecifierValue() === moduleSpecifier);
}

/**
 * Finds a named import specifier for `name` across ALL of the module's import declarations
 * (not just the first one) and returns it together with the declaration that carries it.
 */
function findNamedImport(
  sourceFile: SourceFile,
  moduleSpecifier: string,
  name: string,
): { importDeclaration: ImportDeclaration; namedImport: ReturnType<ImportDeclaration['getNamedImports']>[number] } | undefined {
  for (const importDeclaration of findImports(sourceFile, moduleSpecifier)) {
    const namedImport = importDeclaration.getNamedImports().find((specifier) => specifier.getName() === name);
    if (namedImport) {
      return { importDeclaration, namedImport };
    }
  }
  return undefined;
}

/**
 * Adds a named import, creating the import declaration if it does not exist yet. Re-resolves the
 * declaration by module specifier rather than taking a node reference, so it is always safe to
 * call even right after a `removeNamedImport` call may have deleted the whole declaration.
 */
function addNamedImport(sourceFile: SourceFile, moduleSpecifier: string, name: string): void {
  const existingDeclarations = findImports(sourceFile, moduleSpecifier);

  const alreadyImported = existingDeclarations.some((declaration) =>
    declaration.getNamedImports().some((namedImport) => namedImport.getName() === name),
  );

  if (alreadyImported) {
    return;
  }

  // Never add a value import (e.g. DynamicApiEntityService, used at runtime) into a
  // `import type { ... }` declaration — every named import in a type-only declaration is
  // type-only too, which would break the very call site this rename is meant to keep working.
  const targetDeclaration =
    existingDeclarations.find((declaration) => !declaration.isTypeOnly()) ??
    sourceFile.addImportDeclaration({ moduleSpecifier, namedImports: [] });

  targetDeclaration.addNamedImport(name);
}

/**
 * Removes a single named import, deleting the whole import declaration if it becomes empty.
 * Searches every import declaration for the module (not just the first) so a name imported in a
 * separate `import` statement of the same module is found and removed too.
 */
function removeNamedImport(sourceFile: SourceFile, moduleSpecifier: string, name: string): void {
  const found = findNamedImport(sourceFile, moduleSpecifier, name);

  if (!found) {
    return;
  }

  const { importDeclaration, namedImport } = found;

  namedImport.remove();

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

  const found = findNamedImport(sourceFile, PACKAGE_NAME, 'DynamicApiGlobalStateService');

  if (!found) {
    return { filePath, changed: false, fixes, warnings };
  }

  const { namedImport } = found;

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
 * Verbose/all-caps aliases removed in v5 whose replacement is a pure 1:1 rename — no argument
 * merging or signature change involved, unlike `DynamicApiGlobalStateService` or the schema
 * decorators above. Each entry renames both the import specifier and every type-position usage.
 */
const SIMPLE_RENAMES: { oldName: string; newName: string }[] = [
  { oldName: 'DynamicAPIRouteConfig', newName: 'DynamicApiRouteConfig' },
  { oldName: 'DynamicApiServiceBeforeSaveCreateContext', newName: 'BeforeSaveCreateContext' },
  { oldName: 'DynamicApiServiceBeforeSaveCreateManyContext', newName: 'BeforeSaveCreateManyContext' },
  { oldName: 'DynamicApiServiceBeforeSaveUpdateContext', newName: 'BeforeSaveUpdateContext' },
  { oldName: 'DynamicApiServiceBeforeSaveUpdateManyContext', newName: 'BeforeSaveUpdateManyContext' },
  { oldName: 'DynamicApiServiceBeforeSaveReplaceContext', newName: 'BeforeSaveReplaceContext' },
  { oldName: 'DynamicApiServiceBeforeSaveDeleteContext', newName: 'BeforeSaveDeleteContext' },
  { oldName: 'DynamicApiServiceBeforeSaveDeleteManyContext', newName: 'BeforeSaveDeleteManyContext' },
  { oldName: 'DynamicApiServiceBeforeSaveDuplicateContext', newName: 'BeforeSaveDuplicateContext' },
  { oldName: 'DynamicApiServiceBeforeSaveDuplicateManyContext', newName: 'BeforeSaveDuplicateManyContext' },
  { oldName: 'DynamicApiServiceBeforeSaveCallback', newName: 'BeforeSaveCallback' },
  { oldName: 'DynamicApiServiceBeforeSaveListCallback', newName: 'BeforeSaveListCallback' },
  { oldName: 'DynamicApiServiceBeforeSaveDeleteCallback', newName: 'BeforeSaveDeleteCallback' },
  { oldName: 'DynamicApiServiceBeforeSaveDeleteManyCallback', newName: 'BeforeSaveDeleteManyCallback' },
  { oldName: 'DynamicApiCallbackMethods', newName: 'CallbackMethods' },
  { oldName: 'DynamicApiServiceCallback', newName: 'AfterSaveCallback' },
  { oldName: 'DynamicAPIServiceProvider', newName: 'DynamicApiServiceProvider' },
  { oldName: 'DynamicAPISwaggerExtraConfig', newName: 'DynamicApiSwaggerExtraConfig' },
  { oldName: 'DynamicAPISwaggerOptions', newName: 'DynamicApiSwaggerOptions' },
];

/**
 * Transform 3 — every verbose/all-caps alias in {@link SIMPLE_RENAMES} is a pure 1:1 rename: swap
 * the import specifier and every type-position usage for the canonical short name.
 */
function migrateSimpleRenames(sourceFile: SourceFile): FileMigrationResult {
  const filePath = sourceFile.getFilePath();
  const fixes: string[] = [];
  const warnings: string[] = [];

  for (const { oldName, newName } of SIMPLE_RENAMES) {
    const found = findNamedImport(sourceFile, PACKAGE_NAME, oldName);

    if (!found) {
      continue;
    }

    const { namedImport } = found;

    if (namedImport.getAliasNode()) {
      warnings.push(
        `imports ${oldName} under an alias ('as ...') — not auto-migrated, rename its usages to ${newName} manually.`,
      );
      continue;
    }

    const identifiers = sourceFile
      .getDescendantsOfKind(SyntaxKind.Identifier)
      .filter((node) => node.getText() === oldName && !node.getFirstAncestorByKind(SyntaxKind.ImportSpecifier));

    identifiers.forEach((identifier) => identifier.replaceWithText(newName));

    // Add the new import before removing the old one — see the note on the equivalent sequence in
    // migrateGlobalStateService above.
    addNamedImport(sourceFile, PACKAGE_NAME, newName);
    removeNamedImport(sourceFile, PACKAGE_NAME, oldName);

    fixes.push(`renamed ${oldName} to ${newName} (${identifiers.length} usage(s)).`);
  }

  return { filePath, changed: fixes.length > 0, fixes, warnings };
}

/**
 * Transform 4 — `enableDynamicAPIWebSockets(app, 50)` (a bare number as the second argument) is
 * rewritten to `enableDynamicAPIWebSockets(app, { maxListeners: 50 })`. Only a numeric-literal
 * argument is rewritten; anything else (a variable, an expression) is reported for manual review.
 */
function migrateWebSocketsMaxListenersOverload(sourceFile: SourceFile): FileMigrationResult {
  const filePath = sourceFile.getFilePath();
  const fixes: string[] = [];
  const warnings: string[] = [];

  const calls = sourceFile
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter((call) => call.getExpression().getText() === 'enableDynamicAPIWebSockets' && call.getArguments().length === 2);

  for (const call of calls) {
    const secondArg = call.getArguments()[1];

    if (secondArg.asKind(SyntaxKind.ObjectLiteralExpression)) {
      continue;
    }

    if (secondArg.asKind(SyntaxKind.NumericLiteral)) {
      const line = call.getStartLineNumber();
      const originalText = secondArg.getText();
      secondArg.replaceWithText(`{ maxListeners: ${originalText} }`);
      fixes.push(`line ${line}: rewrote enableDynamicAPIWebSockets(app, ${originalText}) to the options-object form.`);
      continue;
    }

    warnings.push(
      `line ${call.getStartLineNumber()}: enableDynamicAPIWebSockets's second argument is not a plain number literal — the numeric-overload form is gone in v5, pass { maxListeners } manually.`,
    );
  }

  return { filePath, changed: fixes.length > 0, fixes, warnings };
}

/**
 * Report-only scan for symbols removed in v5 that have no direct, mechanical replacement — these
 * can only be flagged for manual review, never auto-fixed.
 */
function scanForRemovedSymbols(sourceFile: SourceFile): FileMigrationResult {
  const filePath = sourceFile.getFilePath();
  const warnings: string[] = [];

  const importDeclarations = findImports(sourceFile, PACKAGE_NAME);
  if (importDeclarations.length === 0) {
    return { filePath, changed: false, fixes: [], warnings };
  }

  const importedNames = new Set(
    importDeclarations.flatMap((declaration) => declaration.getNamedImports().map((specifier) => specifier.getName())),
  );

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
    migrateSimpleRenames(sourceFile),
    migrateWebSocketsMaxListenersOverload(sourceFile),
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
