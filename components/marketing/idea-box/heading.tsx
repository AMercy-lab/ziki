import Link from "next/link";
import { marketingPath, projectPath } from "@/lib/project-paths";

export function IdeaBoxHeading({ slug, projectName }: { slug?: string; projectName?: string }) {
  return <>
    {slug && <nav aria-label="Breadcrumb" className="ib-breadcrumb">
      <Link href={projectPath(slug)}>{projectName ?? "Project"}</Link><span aria-hidden="true">›</span>
      <Link href={marketingPath(slug)}>Marketing</Link><span aria-hidden="true">›</span>
      <span aria-current="page">Idea Box</span>
    </nav>}
    <header className="ib-heading"><div><h1>Idea Box</h1><p>The finished work. All in one place.</p></div>
      <span className="ib-published"><span aria-hidden="true">✓</span> Live · Published only</span>
    </header>
  </>;
}
