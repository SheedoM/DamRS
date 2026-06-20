"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const TOAST_MESSAGES: Record<string, string> = {
  "project-created": "Project created successfully",
  "project-updated": "Project updated successfully",
  "draft-saved": "Draft review saved successfully",
  "final-saved": "Final review submitted successfully",
  "window-saved": "Submission window updated successfully",
};

export function Toast() {
  const searchParams = useSearchParams();
  const successKey = searchParams.get("success");
  
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (successKey && TOAST_MESSAGES[successKey]) {
      setMessage(TOAST_MESSAGES[successKey]);
      setVisible(true);
      
      // Remove query param without full navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      window.history.replaceState({}, "", url.toString());

      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [successKey]);

  if (!visible || !message) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800 shadow-lg transition-all duration-300",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      )}
    >
      <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={() => setVisible(false)}
        className="ml-4 rounded-md p-1 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
