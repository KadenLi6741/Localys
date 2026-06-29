/**
 * ID-shape helpers used to tell real Supabase rows apart from demo/seeded content.
 *
 * Demo/seeded content (local videos, slug-based stores like "jays-burger",
 * "local:..." ids, and client-only demo comments) does NOT have a real Supabase
 * UUID. Sending those ids to Postgres uuid columns throws
 * `invalid input syntax for type uuid` or foreign-key violations. Engagement
 * actions therefore branch on `isDemoId` and stay fully client-side for demo
 * content while using the normal Supabase path for real rows.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
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
