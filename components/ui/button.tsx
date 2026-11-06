import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-secondary";

const variants: Record<Variant, string> = {
  primary:
    "bg-electric-blue-strong text-white hover:brightness-110 shadow-sm focus-visible:ring-electric-blue",
  secondary:
    "border border-zk-border bg-zk-surface text-zk-text hover:bg-zk-chip focus-visible:ring-zk-accent",
  ghost: "bg-transparent text-zk-text2 hover:bg-zk-chip hover:text-zk-text",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600",
  "danger-secondary":
    "border border-zk-bad-bd bg-zk-surface text-zk-bad-fg hover:bg-zk-bad-bg/60 focus-visible:ring-red-500",
};

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
