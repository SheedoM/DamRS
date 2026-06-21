"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

import { resolveTourKey, tours, type TourStep } from "@/lib/tour/tour-steps";

function doneKey(key: string) {
  return `damrs_tour_done::${key}`;
}

function presentSteps(steps: readonly TourStep[]): TourStep[] {
  return steps.filter((step) => document.querySelector(step.element));
}

// Mounted once in the root layout. Derives the tour from the current route,
// auto-runs it the first time that page is opened on this device (localStorage),
// and always exposes a manual replay button when the page has a tour.
export function TourController() {
  const pathname = usePathname();
  const tourKey = resolveTourKey(pathname || "/");
  const [hasSteps, setHasSteps] = useState(false);

  const runTour = useCallback(() => {
    if (!tourKey) return;
    const steps = presentSteps(tours[tourKey]);
    if (steps.length === 0) return;

    const instance = driver({
      showProgress: true,
      allowClose: true,
      overlayOpacity: 0.6,
      nextBtnText: "التالي",
      prevBtnText: "السابق",
      doneBtnText: "تم",
      progressText: "{{current}} من {{total}}",
      popoverClass: "damrs-tour",
      steps: steps.map((step) => ({
        element: step.element,
        popover: {
          title: step.title,
          description: step.description,
          side: step.side,
          align: step.align,
        },
      })),
      onDestroyed: () => {
        try {
          localStorage.setItem(doneKey(tourKey), "1");
        } catch {
          /* localStorage unavailable — ignore */
        }
      },
    });

    instance.drive();
  }, [tourKey]);

  useEffect(() => {
    if (!tourKey) {
      setHasSteps(false);
      return;
    }

    let cancelled = false;
    // Give the page a moment to render its anchors before measuring/auto-running.
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const steps = presentSteps(tours[tourKey]);
      setHasSteps(steps.length > 0);

      let alreadyDone = false;
      try {
        alreadyDone = Boolean(localStorage.getItem(doneKey(tourKey)));
      } catch {
        /* ignore */
      }

      if (steps.length > 0 && !alreadyDone) {
        runTour();
      }
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [tourKey, runTour]);

  if (!hasSteps) return null;

  return (
    <button
      type="button"
      onClick={runTour}
      aria-label="ابدأ الجولة الإرشادية"
      className="fixed bottom-4 start-4 z-40 flex items-center gap-2 rounded-full bg-[var(--brand-blue)] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
    >
      <span aria-hidden="true" className="text-base leading-none">؟</span>
      جولة إرشادية
    </button>
  );
}
