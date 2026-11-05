import Link from "next/link";
import { marketingPath, projectPath } from "@/lib/project-paths";

export function LibraryHeading({ slug, projectName }: { slug?: string; projectName?: string }) {
  return <>
    {slug && <nav aria-label="Breadcrumb" className="lb-breadcrumb">
      <Link href={projectPath(slug)}>{projectName ?? "Project"}</Link><span aria-hidden="true">›</span>
      <Link href={marketingPath(slug)}>Marketing</Link><span aria-hidden="true">›</span>
      <span aria-current="page">Library</span>
    </nav>}
    <header className="lb-heading"><div><h1>Library</h1><p>The finished work. All in one place.</p></div>
      <span className="lb-published"><span aria-hidden="true">✓</span> Live · Published only</span>
    </header>
  </>;
}
