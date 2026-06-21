"use client";

import { ReactNode } from "react";

type LogoutButtonProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Submits a POST to /logout to sign the user out.
 * Must be a form POST — never a <Link href="/logout"> — because Next.js
 * prefetches all Link hrefs, which would trigger a GET and silently log the
 * user out on every page that renders a logout link.
 */
export function LogoutButton({ children, className }: LogoutButtonProps) {
  return (
    <form method="POST" action="/logout">
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
