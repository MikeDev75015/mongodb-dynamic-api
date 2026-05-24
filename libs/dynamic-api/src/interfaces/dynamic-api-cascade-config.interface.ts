import { Type } from '@nestjs/common';
import { BaseEntity } from '../models';

/**
 * Configures automatic cascade deletion of child documents when a parent is deleted.
 *
 * @example
 * // Hard-delete comments when a post is hard-deleted
 * cascade: [{ entity: CommentEntity, foreignKey: 'postId', on: 'delete' }]
 *
 * @example
 * // Soft-delete comments when a post is soft-deleted, forcing soft-delete on children
 * cascade: [{ entity: CommentEntity, foreignKey: 'postId', on: 'softDelete', softDelete: true }]
 */
interface CascadeConfig {
  /**
   * The child entity class whose documents will be deleted when the parent is deleted.
   */
  entity: Type<BaseEntity>;

  /**
   * The field name on the child entity that holds a reference to the parent document's ID.
   */
  foreignKey: string;

  /**
   * When to trigger the cascade:
   * - `'delete'`     — triggered when the parent entity is **hard-deleted**  (i.e., not soft-deletable).
   * - `'softDelete'` — triggered only when the parent entity is **soft-deleted** AND `isSoftDeletable === true`.
   */
  on: 'delete' | 'softDelete';

  /**
   * Controls how children are deleted:
   * - `true`      — children are always soft-deleted (sets `isDeleted: true` + `deletedAt`).
   * - `false`     — children are always hard-deleted.
   * - `undefined` — mirrors the parent: children are soft-deleted if the parent was soft-deleted,
   *                 hard-deleted if the parent was hard-deleted (**default**).
   */
  softDelete?: boolean;
}

export { CascadeConfig };

