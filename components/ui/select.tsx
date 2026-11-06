import type { SelectHTMLAttributes } from "react";

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full cursor-pointer rounded-lg border border-zk-border bg-zk-surface px-3 py-2 text-sm text-zk-text shadow-sm focus:border-zk-accent focus:outline-none focus:ring-2 focus:ring-zk-accent/20 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
