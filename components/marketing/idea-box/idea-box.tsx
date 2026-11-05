"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { refreshIdeaBox } from "@/app/(app)/[project]/marketing/idea-box/actions";
import { marketingPath, projectPath } from "@/lib/project-paths";
import { formatBytes } from "@/lib/attachments";
import { formatDate } from "@/lib/format";
import { CONTENT_TYPES, filterIdeaBox, type ContentType, type IdeaBoxFile, type IdeaBoxItem, type IdeaBoxResult } from "./model";
import { IdeaBoxHeading } from "./heading";
import "./idea-box.css";

function publishedDate(date: string | null) {
  return date ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(date)) : "Date unavailable";
}

function FileMark({ file }: { file?: IdeaBoxFile }) {
  const label = !file ? "FILE" : ({ Graphics: "IMG", Videos: "PLAY", Articles: "READ", PDFs: "PDF", Docs: "DOC", Links: "LINK" })[file.kind];
  return <span className="ib-file-mark" data-kind={file?.kind} aria-hidden="true"><strong>{label}</strong><span>{file?.name ?? "Deliverable"}</span></span>;
}

function FileThumbnail({ file }: { file?: IdeaBoxFile }) {
  const [failed, setFailed] = useState(false);
  if (file?.kind !== "Graphics" || failed) return <FileMark file={file} />;
  return <span className="ib-thumbnail" aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary approved image sources, with a fallback */}
    <img src={file.url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  </span>;
}

export function IdeaBox({ slug, projectName, initial }: { slug: string; projectName: string; initial: IdeaBoxResult }) {
  const params = useSearchParams();
  const [result, setResult] = useState(initial);
  const [refreshError, setRefreshError] = useState(false);
  const [pending, setPending] = useState(false);
  const request = useRef(false);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const heading = useRef<HTMLHeadingElement>(null);
  const errorHeading = useRef<HTMLHeadingElement>(null);
  const scrollBeforeDetail = useRef(0);
  const search = params.get("q") ?? "";
  const rawType = params.get("type");
  const type: ContentType = CONTENT_TYPES.find((value) => value === rawType) ?? "All";
  const oldest = params.get("sort") === "oldest";
  const items = result.ok ? result.items : [];
  const filtered = filterIdeaBox(items, search, type, oldest);
  const selected = filtered.find((item) => item.id === params.get("item")) ?? filtered[0];
  const selectedFile = selected?.files.find((file) => file.id === params.get("file"))
    ?? selected?.files.find((file) => type === "All" || file.kind === type) ?? selected?.files[0];
  const detail = params.get("view") === "detail" && Boolean(selected);
  const previousDetail = useRef(detail);

  function update(values: Record<string, string | null>, push = false) {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value); else next.delete(key);
    }
    const url = `${window.location.pathname}${next.size ? `?${next}` : ""}`;
    if (push) window.history.pushState(null, "", url); else window.history.replaceState(null, "", url);
  }

  function select(item: IdeaBoxItem) {
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (mobile) scrollBeforeDetail.current = window.scrollY;
    update({ item: item.id, file: null, view: mobile ? "detail" : null }, mobile);
    if (mobile) window.scrollTo({ top: 0 });
  }

  function back() {
    update({ view: null });
  }

  useEffect(() => {
    if (detail && window.matchMedia("(max-width: 767px)").matches) heading.current?.focus();
    if (previousDetail.current && !detail) {
      rowRefs.current.get(selected?.id ?? "")?.focus({ preventScroll: true });
      window.scrollTo({ top: scrollBeforeDetail.current });
    }
    previousDetail.current = detail;
  }, [detail, selected?.id]);

  useEffect(() => {
    if (!result.ok) errorHeading.current?.focus();
  }, [result.ok]);

  async function refresh() {
    if (request.current) return;
    request.current = true;
    setPending(true);
    try {
      const next = await refreshIdeaBox(slug);
      if (next.ok) { setResult(next); setRefreshError(false); }
      else if (result.ok) setRefreshError(true);
      else setResult(next);
    } catch {
      if (result.ok) setRefreshError(true); else setResult({ ok: false });
    } finally { request.current = false; setPending(false); }
  }

  const tasksPath = marketingPath(slug);
  return <div className="ib-page" data-detail={detail}>
    <IdeaBoxHeading slug={slug} projectName={projectName} />
    {!result.ok ? <section className="ib-state" aria-busy={pending}>
      <span className="ib-state-icon ib-warning" aria-hidden="true">!</span>
      <h2 ref={errorHeading} tabIndex={-1} role="alert">We couldn’t load Idea Box</h2><p>Check your connection and try again in a moment.</p>
      <button className="ib-button ib-primary" onClick={refresh} disabled={pending}>{pending ? "Trying again…" : "Try again"}</button>
    </section> : items.length === 0 ? <section className="ib-state">
      <span className="ib-state-icon" aria-hidden="true">◇</span><h2>No approved work yet</h2>
      <p>Deliverables will appear here when a marketing task reaches Live · Published.</p>
      <Link className="ib-button ib-primary" href={tasksPath}>View Marketing</Link>
    </section> : <>
      {refreshError && <div className="ib-refresh-error" role="alert">We couldn’t refresh Idea Box. Your previous results are still shown. <button className="ib-button" onClick={refresh} disabled={pending}>Try again</button></div>}
      <div className="ib-toolbar" aria-label="Find approved work">
        <label className="ib-search"><span className="sr-only">Search approved work</span><span aria-hidden="true">⌕</span><input type="search" placeholder="Search approved work…" value={search} onChange={(event) => update({ q: event.target.value || null, view: null })} /></label>
        <div className="ib-filters" role="group" aria-label="Deliverable type">{CONTENT_TYPES.map((value) => <button key={value} className="ib-filter" aria-pressed={type === value} onClick={() => update({ type: value === "All" ? null : value, file: null, view: null })}>{value}</button>)}</div>
        <label className="ib-sort"><span className="sr-only">Sort by publication date</span><select value={oldest ? "oldest" : "newest"} onChange={(event) => update({ sort: event.target.value === "oldest" ? "oldest" : null })}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
        <button className="ib-button ib-refresh" onClick={refresh} disabled={pending}>{pending ? "Refreshing…" : "Refresh"}</button>
      </div>
      <p className="ib-count" role="status">{pending ? "Refreshing approved work…" : `${filtered.length} ${filtered.length === 1 ? "deliverable" : "deliverables"} · ${filtered.reduce((count, item) => count + item.files.length, 0)} files & links`}</p>
      {filtered.length === 0 ? <section className="ib-state ib-no-matches"><h2>No matching work</h2><p>Try another search or clear the content filter.</p><button className="ib-button" onClick={() => update({ q: null, type: null, view: null })}>Clear filters</button></section> : <div className="ib-split">
        <section className="ib-collection" aria-label="Approved deliverables"><ul>{filtered.map((item) => {
          const file = item.files.find((file) => type === "All" || file.kind === type) ?? item.files[0];
          return <li key={item.id}><button ref={(node) => { if (node) rowRefs.current.set(item.id, node); else rowRefs.current.delete(item.id); }} className="ib-row" onClick={() => select(item)} aria-pressed={selected?.id === item.id}>
            <FileThumbnail key={file?.id} file={file} /><span className="ib-row-content"><strong>{item.title}</strong><span>Task #{item.number}</span><span>{item.agent} · {publishedDate(item.publishedAt)}</span><span>{item.files.length} {item.files.length === 1 ? "file or link" : "files & links"}</span></span>
            <span className="sr-only">{file ? `${file.kind}: ${file.name}` : "Source unavailable"}</span>
            {selected?.id === item.id && <span className="ib-selected" aria-hidden="true">✓</span>}
          </button></li>;
        })}</ul></section>
        {selected && <section className="ib-detail" aria-label="Selected deliverable">
          <button className="ib-button ib-back" onClick={back}>← Back to Idea Box</button>
          <div className="ib-detail-top"><span>Deliverable preview</span><span className="ib-published">✓ Live · Published</span></div>
          <h2 ref={heading} tabIndex={-1} className="ib-detail-title">{selected.title}</h2>
          <dl className="ib-metadata"><div><dt>Produced by</dt><dd>{selected.agent}</dd></div><div><dt>Published</dt><dd>{selected.publishedAt ? <time dateTime={selected.publishedAt} title={formatDate(selected.publishedAt)}>{publishedDate(selected.publishedAt)}</time> : "Date unavailable"}</dd></div><div><dt>Associated task</dt><dd><Link href={projectPath(slug, `/${selected.number}`)}>Task #{selected.number}</Link></dd></div></dl>
          {selected.files.length > 1 && <div className="ib-attachments" role="group" aria-label="Task deliverables">{selected.files.map((file) => <button key={file.id} className="ib-file-choice" aria-pressed={selectedFile?.id === file.id} onClick={() => update({ file: file.id })}>{file.name}</button>)}</div>}
          {selectedFile ? <DeliverablePreview key={`${selected.id}:${selectedFile.id}`} file={selectedFile} item={selected} slug={slug} /> : <div className="ib-fallback"><h3>Original unavailable</h3><p>No deliverable source is available. You can still view the task.</p></div>}
        </section>}
      </div>}
    </>}
  </div>;
}

function DeliverablePreview({ file, item, slug }: { file: IdeaBoxFile; item: IdeaBoxItem; slug: string }) {
  const supported = ["Graphics", "Videos", "PDFs"].includes(file.kind);
  const [state, setState] = useState<"loading" | "ready" | "error">(supported ? "loading" : "ready");
  const [attempt, setAttempt] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const downloadingRef = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const source = file.local ? "Ziki attachment" : new URL(file.url).hostname;
  async function failed() {
    setState("error");
    // Authenticated local files have meaningful status codes; do not probe external hosts.
    if (file.local) {
      try {
        const response = await fetch(file.url, { method: "HEAD" });
        if (mounted.current && [403, 404, 410].includes(response.status)) setUnavailable(true);
      } catch { /* A network error doesn't prove the original was removed. */ }
    }
  }
  async function download() {
    if (downloadingRef.current) return;
    downloadingRef.current = true; setDownloading(true); setDownloadError(false);
    try {
      // Blob download also works for cross-origin file URLs when their host permits CORS.
      const response = await fetch(file.url, { credentials: file.local ? "same-origin" : "omit" });
      if (!response.ok) {
        if ([404, 410].includes(response.status) && mounted.current) setUnavailable(true);
        throw new Error("Download failed");
      }
      if (response.headers.get("content-type")?.includes("text/html")) throw new Error("The source returned a web page instead of the file");
      const blob = await response.blob();
      if (!mounted.current) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.name;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { if (mounted.current) setDownloadError(true); }
    finally { downloadingRef.current = false; if (mounted.current) setDownloading(false); }
  }
  return <>
    <div className="ib-media" aria-busy={state === "loading"}>
      {unavailable ? <div className="ib-fallback"><FileMark file={file} /><h3>Original unavailable</h3><p>This source was removed or is no longer accessible.</p></div> : state === "error" ? <div className="ib-fallback" role="status"><FileMark file={file} /><h3>Preview couldn’t load</h3><p>You can try again or open the original.</p><button className="ib-button" onClick={() => { setState("loading"); setAttempt(attempt + 1); }}>Retry preview</button></div> : <>
        {state === "loading" && <div className="ib-preview-loading" aria-hidden="true"><div className="ib-skeleton" /></div>}
        {file.kind === "Graphics" ? (
          // eslint-disable-next-line @next/next/no-img-element -- approved arbitrary deliverable URLs and authenticated local attachments
          <img key={attempt} src={file.url} alt={`${item.title} — ${file.name}`} className={state === "loading" ? "ib-loading-media" : ""} onLoad={() => setState("ready")} onError={failed} referrerPolicy="no-referrer" />
        ) : file.kind === "Videos" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- the delivery contract has no caption track; the delivery summary and original remain available
          <video key={attempt} controls preload="metadata" aria-label={`${item.title} — ${file.name}`} onLoadedMetadata={() => setState("ready")} onError={failed}>
          <source src={file.url} />Your browser cannot preview this video. Open the original to watch it.
        </video>) : file.kind === "PDFs" ? <iframe key={attempt} src={`${file.url.split("#")[0]}#page=1`} title={`PDF preview: ${file.name}`} sandbox="" referrerPolicy="no-referrer" onLoad={() => setState("ready")} onError={failed} /> : <div className="ib-fallback"><FileMark file={file} />
          <h3>{file.kind === "Links" || file.kind === "Articles" ? file.name : "Preview isn’t available for this file"}</h3>
          <p>{file.kind === "Links" || file.kind === "Articles" ? source : "You can still open or download the original document."}</p>
          {(file.kind === "Links" || file.kind === "Articles") && <p className="ib-delivery-note">{item.summary}</p>}
        </div>}
      </>}
    </div>
    <p className="sr-only" role="status">{state === "loading" ? `Loading preview for ${file.name}` : unavailable ? "Original unavailable" : state === "error" ? "Preview couldn’t load" : `${file.name} preview ready`}</p>
    <div className="ib-file-description"><strong>{file.name}</strong><span>{file.kind}{file.size !== null ? ` · ${formatBytes(file.size)}` : ""} · {source}</span></div>
    <div className="ib-actions">
      {unavailable ? <span className="ib-button" aria-disabled="true">Original unavailable</span> : <a className="ib-button ib-primary" href={file.url} target="_blank" rel="noopener noreferrer">Open original <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>}
      <Link className="ib-button" href={projectPath(slug, `/${item.number}`)}>View task #{item.number} <span aria-hidden="true">↗</span></Link>
      {file.downloadable && <button className="ib-button" disabled={unavailable || downloading} onClick={download}>{downloading ? "Downloading…" : "Download"} <span aria-hidden="true">↓</span></button>}
    </div>
    {downloadError && <p className="ib-download-error" role="alert">The download failed. Try again, or open the original to save it from its source.</p>}
  </>;
}
