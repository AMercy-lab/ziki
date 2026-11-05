import { ForceLightTheme } from "@/components/force-light-theme";

/** Every earn page is light only. */
export default function EarnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ForceLightTheme />
      {children}
    </>
  );
}
