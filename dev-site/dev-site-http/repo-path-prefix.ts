/**
 * Match a repo-relative path against a list prefix.
 *
 * - no prefix → every path
 * - exact path
 * - descendants: `docs` matches `docs/guide.md`
 * - file stem: `src/Foo` matches `src/Foo.ts`, `src/Foo.test.ts`, `src/Foo.vue`
 *   but not `src/FooAsync.vue` or `src/FooBar.ts`
 */
export function matchesPathPrefix(path: string, prefix: string): boolean {
  if (!prefix) return true;
  return (
    path === prefix ||
    path.startsWith(`${prefix}/`) ||
    path.startsWith(`${prefix}.`)
  );
}
