"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A lightweight, zero-dependency top-of-page progress bar that gives feedback
 * during route transitions. It starts when a navigation begins (an internal
 * link click or a programmatic router.push/replace, which both go through the
 * History API) and completes once the destination route has rendered.
 *
 * This covers every navigation in the app — sidebar links, redirects after
 * login, server-action redirects — without each caller having to wire up its
 * own pending state.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 0 = hidden. >0 = visible and animating toward (but never reaching) 100
  // until the navigation completes, at which point it snaps to 100 and fades.
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- start / done helpers ---------------------------------------------
  function clearTimers() {
    if (trickleRef.current) {
      clearInterval(trickleRef.current);
      trickleRef.current = null;
    }
    if (doneTimerRef.current) {
      clearTimeout(doneTimerRef.current);
      doneTimerRef.current = null;
    }
  }

  function start() {
    clearTimers();
    setVisible(true);
    setProgress(10);
    // Trickle forward, slowing as it approaches the top so it never "finishes"
    // on its own — it only completes when the route actually changes.
    trickleRef.current = setInterval(() => {
      setProgress((current) => {
        if (current >= 90) return current;
        const remaining = 90 - current;
        return current + Math.max(0.5, remaining * 0.08);
      });
    }, 200);
  }

  function done() {
    clearTimers();
    setProgress(100);
    doneTimerRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }

  // --- detect navigation start ------------------------------------------
  useEffect(() => {
    // 1) Programmatic navigation (router.push / router.replace) and most
    //    internal navigations commit through the History API.
    const originalPush = history.pushState.bind(history);
    const originalReplace = history.replaceState.bind(history);

    history.pushState = ((...args: Parameters<typeof history.pushState>) => {
      start();
      return originalPush(...args);
    }) as typeof history.pushState;

    history.replaceState = ((...args: Parameters<typeof history.replaceState>) => {
      start();
      return originalReplace(...args);
    }) as typeof history.replaceState;

    // 2) Anchor clicks — start as early as the click so the bar appears
    //    instantly, before the RSC payload is even requested.
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      // Only same-origin navigations to a different URL.
      try {
        const target = new URL(href, window.location.href);
        if (target.origin !== window.location.origin) return;
        if (target.href === window.location.href) return;
      } catch {
        return;
      }

      start();
    }

    // 3) Browser back/forward.
    function onPopState() {
      start();
    }

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", onPopState);

    return () => {
      history.pushState = originalPush;
      history.replaceState = originalReplace;
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", onPopState);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- detect navigation completion -------------------------------------
  // When the rendered route (pathname or query) changes, the navigation has
  // committed — finish the bar. The effect also runs on mount, which is a
  // harmless no-op since the bar isn't visible yet.
  useEffect(() => {
    const completionTimer = window.setTimeout(() => {
      done();
    }, 0);
    return () => window.clearTimeout(completionTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
      role="progressbar"
      aria-hidden="true"
    >
      <div
        className="h-full bg-[var(--brand-blue)] shadow-[0_0_8px_var(--brand-blue)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
