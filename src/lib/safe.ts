/**
 * Resolves to `fallback` when `p` rejects. Loader safety net: a transient
 * upstream error must degrade one section, never blank the whole route.
 */
export async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}
