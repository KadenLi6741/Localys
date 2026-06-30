/**
 * ID-shape helpers used to tell real Supabase rows apart from demo/seeded content.
 *
 * Demo/seeded content (local videos, slug-based stores like "jays-burger",
 * "local:..." ids, and client-only demo comments) does NOT have a real Supabase
 * UUID. Sending those ids to Postgres uuid columns throws
 * `invalid input syntax for type uuid` or foreign-key violations. Engagement
 * actions therefore branch on `isDemoId` and stay fully client-side for demo
 * content while using the normal Supabase path for real rows.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True only for a syntactically valid Supabase UUID. */
export const isRealUuid = (id?: string | null): boolean => !!id && UUID_RE.test(id);

/**
 * True for anything that is NOT a real UUID — covers `local:...` ids, slug ids
 * (`jays-burger`, `holy-smoke-barbecue`), and `demo-*` client ids. Such content
 * must be handled client-side, never sent to Supabase uuid columns.
 */
export const isDemoId = (id?: string | null): boolean => !isRealUuid(id);

/** Monotonic fallback counter for environments without crypto.randomUUID. */
let demoIdCounter = 0;

/**
 * Guaranteed-unique client id for a demo comment/reply.
 *
 * Keeps the `demo-comment-` prefix so the value is NOT a syntactic UUID and
 * `isDemoId()` still routes its likes/replies through the client-side path.
 * Uses crypto.randomUUID() when available (collision-proof even when many are
 * created in the same millisecond), with a counter+random fallback otherwise.
 * Replaces the old `demo-comment-${Date.now()}` scheme, which collided when
 * several comments were posted within the same millisecond.
 */
export function newDemoCommentId(): string {
  const unique =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${(demoIdCounter++).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `demo-comment-${unique}`;
}
