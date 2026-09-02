import { describe, expect, it } from 'vitest';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { resolveDestination, resource, ResourceOptions } from './index';

describe('resource schematic', () => {
  const runner = new SchematicTestRunner('schematics', __dirname + '/../collection.json');

  const runSchematic = (options: Partial<ResourceOptions>): Promise<UnitTestTree> =>
    runner.runSchematic('resource', options as ResourceOptions);

  it('generates an entity and a module under src/<dasherized-name> by default', async () => {
    const tree = await runSchematic({ name: 'userProfile' });

    expect(tree.files).toEqual(
      expect.arrayContaining([
        '/src/user-profile/user-profile.entity.ts',
        '/src/user-profile/user-profile.module.ts',
      ]),
    );
  });

  it('generates a class extending BaseEntity by default', async () => {
    const tree = await runSchematic({ name: 'user' });
    const entity = tree.readContent('/src/user/user.entity.ts');

    expect(entity).toContain("import { BaseEntity } from 'mongodb-dynamic-api';");
    expect(entity).toContain("@Schema({ collection: 'user' })");
    expect(entity).toContain('export class User extends BaseEntity {');
  });

  it('generates a class extending SoftDeletableEntity when softDelete is true', async () => {
    const tree = await runSchematic({ name: 'user', softDelete: true });
    const entity = tree.readContent('/src/user/user.entity.ts');

    expect(entity).toContain("import { SoftDeletableEntity } from 'mongodb-dynamic-api';");
    expect(entity).toContain('export class User extends SoftDeletableEntity {');
  });

  it('generates a module wiring DynamicApiModule.forFeature to the generated entity', async () => {
    const tree = await runSchematic({ name: 'blog-post' });
    const module = tree.readContent('/src/blog-post/blog-post.module.ts');

    expect(module).toContain("import { BlogPost } from './blog-post.entity';");
    expect(module).toContain('entity: BlogPost,');
    expect(module).toContain("controllerOptions: { path: 'blog-post' },");
    expect(module).toContain('export class BlogPostModule {}');
  });

  it('dasherizes camelCase and PascalCase names for the collection path and file names', async () => {
    const tree = await runSchematic({ name: 'BlogPostComment' });

    expect(tree.files).toEqual(
      expect.arrayContaining([
        '/src/blog-post-comment/blog-post-comment.entity.ts',
        '/src/blog-post-comment/blog-post-comment.module.ts',
      ]),
    );
    expect(tree.readContent('/src/blog-post-comment/blog-post-comment.entity.ts')).toContain(
      'export class BlogPostComment extends BaseEntity {',
    );
  });

  it('respects a custom path option', async () => {
    const tree = await runSchematic({ name: 'user', path: 'libs/api/src' });

    expect(tree.files).toEqual(
      expect.arrayContaining([
        '/libs/api/src/user/user.entity.ts',
        '/libs/api/src/user/user.module.ts',
      ]),
    );
  });

  it('does not create a subdirectory when flat is true', async () => {
    const tree = await runSchematic({ name: 'user', flat: true });

    expect(tree.files).toEqual(
      expect.arrayContaining(['/src/user.entity.ts', '/src/user.module.ts']),
    );
  });

  it('handles a name ending with a separator without producing a trailing uppercase artifact', async () => {
    const tree = await runSchematic({ name: 'user-' });

    expect(tree.readContent('/src/user-/user-.entity.ts')).toContain(
      'export class User extends BaseEntity {',
    );
  });

  it('throws when name is missing', () => {
    expect(() => resource({} as ResourceOptions)).toThrow('name option is required.');
  });

  describe('resolveDestination', () => {
    it('defaults to "src/<dasherized-name>" when path is not provided', () => {
      expect(resolveDestination({ name: 'user' })).toBe('src/user');
    });

    it('uses the given path when provided', () => {
      expect(resolveDestination({ name: 'user', path: 'libs/api/src' })).toBe('libs/api/src/user');
    });

    it('returns the bare path when flat is true', () => {
      expect(resolveDestination({ name: 'user', path: 'src', flat: true })).toBe('src');
    });
  });
});
