/** The mutation that produced an {@link AuditLogEntry}. */
type AuditLogAction = 'create' | 'update' | 'replace' | 'duplicate' | 'delete';

/**
 * A single recorded change, written to the entity's own `<collection>_audit_log` collection
 * when `auditLog: true` is set on the route that produced it.
 */
interface AuditLogEntry {
  /** The mutation that produced this entry. */
  action: AuditLogAction;
  /** `id` of the affected document (the newly created id for `create`/`duplicate`). */
  entityId: string;
  /** Document snapshot before the change. `null` for `create`/`duplicate` (nothing existed yet). */
  before: Record<string, unknown> | null;
  /** Document snapshot after the change. `null` for `delete`. */
  after: Record<string, unknown> | null;
  /** Whatever `user` value the route handler received (typically the decoded JWT payload). */
  user: unknown;
  /** When the entry was written. */
  timestamp: Date;
}

export type { AuditLogAction, AuditLogEntry };
