"use client";

import { useLayoutEffect } from "react";

/**
 * Earn is light only (#earn-light). The server already writes light onto <html> when an earn page is loaded
 * fresh; this covers moving into earn from another page without a reload, and puts the person's own pick
 * (kept on <html> as data-user-theme) back when they leave.
 */
export function ForceLightTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", "light");
    return () => {
      const own = root.getAttribute("data-user-theme");
      if (own === "light" || own === "dark") root.setAttribute("data-theme", own);
      else root.removeAttribute("data-theme");
    };
  }, []);
  return null;
}
