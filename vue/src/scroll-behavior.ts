import type { RouterScrollBehavior } from "vue-router";

/** How long to wait for async page content before restoring scroll anyway. */
const RESTORE_TIMEOUT_MS = 2000;

/**
 * Resolves once the document is tall enough to scroll to `top`, or after
 * {@link RESTORE_TIMEOUT_MS}. Pages are async components which render loading
 * states first, so the saved position often isn't reachable right away.
 */
function waitForScrollableHeight(top: number): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const check = () => {
      const maxTop = document.documentElement.scrollHeight - window.innerHeight;
      if (maxTop >= top || performance.now() - start > RESTORE_TIMEOUT_MS) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    };
    check();
  });
}

/**
 * Scroll behavior for SAF SPAs. Pass to `createRouter({ scrollBehavior })`.
 *
 * - Back/forward: restores the saved position, waiting for content to load.
 * - Hash links: scrolls to the element.
 * - Query-only changes on the same path (filters, tabs): leaves scroll alone.
 * - Everything else: scrolls to the top.
 */
export const scrollBehavior: RouterScrollBehavior = async (
  to,
  from,
  savedPosition,
) => {
  if (savedPosition) {
    await waitForScrollableHeight(savedPosition.top);
    return savedPosition;
  }
  if (to.hash) {
    return { el: to.hash };
  }
  if (to.path === from.path) {
    return false;
  }
  return { top: 0 };
};
