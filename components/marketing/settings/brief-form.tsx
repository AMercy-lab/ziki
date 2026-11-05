"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MarketingBrief, MarketingBriefKey } from "./model";

const URL_PATTERN = /^https?:\/\/\S+$/i;

const FIELDS: {
  key: MarketingBriefKey;
  label: string;
  hint: string;
  max: number;
  rows: number;
  placeholder: string;
}[] = [
  {
    key: "product",
    label: "Product",
    hint: "What the project is, in a sentence.",
    max: 600,
    rows: 2,
    placeholder: "e.g. Ziki, an issue tracker where agents do the work.",
  },
  {
    key: "audience",
    label: "Audience",
    hint: "Who the work is for.",
    max: 300,
    rows: 2,
    placeholder: "e.g. Teams that run coding agents.",
  },
  {
    key: "website",
    label: "Website",
    hint: "A full link, if there is one.",
    max: 2048,
    rows: 1,
    placeholder: "e.g. https://ziki.dev",
  },
  {
    key: "currentFocus",
    label: "Current focus",
    hint: "What the marketing work should serve right now. Proposals answer this with their rationale.",
    max: 600,
    rows: 2,
    placeholder: "e.g. Getting the first ten teams onto the agent workflow.",
  },
  {
    key: "outOfScope",
    label: "Out of scope",
    hint: "What agents should not spend marketing effort on.",
    max: 600,
    rows: 2,
    placeholder: "e.g. Paid advertising.",
  },
];

/** Storage arrives with the brief API (M-API-8). Until then the values stay in this browser. */
const STORAGE_PREFIX = "marketing-brief:";

const emptyBrief = (): MarketingBrief => ({ product: "", audience: "", website: "", currentFocus: "", outOfScope: "" });

/**
 * The project brief panel (M-UI-7 for M-API-8): the short facts agents read
 * before proposing or delivering marketing work. Editing is per-admin browser
 * data for now, so the panel says so; wiring it to the API later touches only
 * the save and load below.
 */
export function BriefForm({ slug }: { slug: string }) {
  const [brief, setBrief] = useState<MarketingBrief>(emptyBrief);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // The draft lives in this browser, so it is read after mounting, in a frame callback.
    const frame = requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_PREFIX + slug);
        if (raw) {
          const stored = JSON.parse(raw) as Partial<MarketingBrief>;
          setBrief({
            ...emptyBrief(),
            ...Object.fromEntries(
              Object.entries(stored).map(([key, value]) => [key, typeof value === "string" ? value : ""]),
            ),
          });
        }
      } catch {
        // Ignore unreadable drafts; the form starts empty instead.
      }
      setLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [slug]);

  function save(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    setSaved(false);

    const websiteTrimmed = brief.website.trim();
    if (websiteTrimmed && !URL_PATTERN.test(websiteTrimmed)) {
      setError("Enter a full http or https link for the website.");
      return;
    }

    const stored = Object.fromEntries(
      FIELDS.map((field) => [field.key, brief[field.key].trim()]),
    ) as unknown as MarketingBrief;
    try {
      window.localStorage.setItem(STORAGE_PREFIX + slug, JSON.stringify(stored));
      setSaved(true);
    } catch {
      setError("The brief couldn't be saved in this browser.");
    }
  }


  return (
    <section aria-labelledby="marketing-brief" className="rounded-[20px] border border-zk-border bg-zk-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="marketing-brief" className="m-0 text-base font-bold text-zk-text">
          Brief
        </h2>
        <span className="rounded-full bg-zk-tint px-2.5 py-0.5 text-xs font-semibold text-zk-accent">
          Saves in this browser for now
        </span>
      </div>
      <p className="mt-1.5 text-sm text-zk-text2">
        What agents should know before proposing or delivering marketing work. They read it when the brief ships
        on the project (M-API-8), so the values here are placeholders until then.
      </p>

      {loaded ? (
        <form onSubmit={save} className="mt-4 flex flex-col gap-4">
          {FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <label htmlFor={`marketing-brief-${field.key}`} className="text-sm font-medium text-zk-text">
                {field.label}
              </label>
              {field.rows > 1 ? (
                <Textarea
                  id={`marketing-brief-${field.key}`}
                  rows={field.rows}
                  maxLength={field.max}
                  placeholder={field.placeholder}
                  value={brief[field.key]}
                  onChange={(event) => setBrief((previous) => ({ ...previous, [field.key]: event.target.value }))}
                />
              ) : (
                <Input
                  id={`marketing-brief-${field.key}`}
                  type={field.key === "website" ? "url" : "text"}
                  maxLength={field.max}
                  placeholder={field.placeholder}
                  value={brief[field.key]}
                  onChange={(event) => setBrief((previous) => ({ ...previous, [field.key]: event.target.value }))}
                />
              )}
              <p className="m-0 text-xs text-zk-muted">{field.hint}</p>
            </div>
          ))}

          {error ? (
            <div role="alert" className="rounded-xl border border-zk-bad-bd bg-zk-bad-bg px-3 py-2 text-sm text-zk-bad-fg">
              {error}
            </div>
          ) : saved ? (
            <p role="status" className="m-0 text-sm text-zk-ok-fg">
              Saved in this browser. It will move to the project when the brief API merges.
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button type="submit">Save brief</Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
