"use client";

import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
  type SVGProps,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/* ---------- Inline icons (no icon library needed) ---------- */

type IconProps = SVGProps<SVGSVGElement>;

function makeIcon(d: string, extra?: ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <path d={d} />
        {extra}
      </svg>
    );
  };
}

const AtSign = makeIcon("M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8", <circle cx="12" cy="12" r="4" />);
const Bold = makeIcon("M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8");
const Bot = makeIcon(
  "M12 8V4H8 M6 8h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z M2 14h2 M20 14h2 M15 13v2 M9 13v2",
);
const Code = makeIcon("m16 18 6-6-6-6 M8 6l-6 6 6 6");
const FileText = makeIcon(
  "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z M14 2v4a2 2 0 0 0 2 2h4 M10 9H8 M16 13H8 M16 17H8",
);
const Heading1 = makeIcon("M4 12h8 M4 18V6 M12 18V6 M17 12l3-2v8");
const Heading2 = makeIcon("M4 12h8 M4 18V6 M12 18V6 M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1");
const Heading3 = makeIcon(
  "M4 12h8 M4 18V6 M12 18V6 M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2 M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2",
);
const ImageIcon = makeIcon(
  "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M21 15l-3.1-3.1a2 2 0 0 0-2.8 0L6 21",
  <circle cx="9" cy="9" r="2" />,
);
const Info = makeIcon("M12 16v-4 M12 8h.01", <circle cx="12" cy="12" r="10" />);
const Italic = makeIcon("M19 4h-9 M14 20H5 M15 4 9 20");
const Link2 = makeIcon("M9 17H7A5 5 0 0 1 7 7h2 M15 7h2a5 5 0 1 1 0 10h-2 M8 12h8");
const List = makeIcon("M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01");
const ListOrdered = makeIcon("M10 6h11 M10 12h11 M10 18h11 M4 6h1v4 M4 10h2 M6 18H4c0-1 2-2 2-3s-1-1.5-2-1");
const Minus = makeIcon("M5 12h14");
const Paperclip = makeIcon(
  "m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48",
);
const Plus = makeIcon("M5 12h14 M12 5v14");
const Quote = makeIcon("M17 6H3 M21 12H8 M21 18H8 M3 12v6");
const Send = makeIcon("M22 2 11 13 M22 2l-7 20-4-9-9-4z");
const SlidersHorizontal = makeIcon("M21 4h-7 M10 4H3 M21 12h-9 M8 12H3 M21 20h-5 M12 20H3 M14 2v4 M8 10v4 M16 18v4");
const Strikethrough = makeIcon("M16 4H9a3 3 0 0 0-2.83 4 M14 12a4 4 0 0 1 0 8H6 M4 12h16");
const X = makeIcon("M18 6 6 18 M6 6l12 12");

type MarketingTaskType = {
  id: string;
  name: string;
  points: number;
  maxPoints: number;
};

// Temporary local preview data; replace with M-API-7 task types before enabling submission.
const MOCK_TASK_TYPES: MarketingTaskType[] = [
  { id: "mock-content", name: "Content", points: 1, maxPoints: 20 },
  { id: "mock-social", name: "Social Media & Community", points: 1, maxPoints: 20 },
  { id: "mock-design", name: "Design", points: 1, maxPoints: 20 },
];

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;
const RATIONALE_MAX = 2000;

const MAX_FILES = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
];
const ACCEPT_ATTR = ".png,.jpg,.jpeg,.gif,.webp,.pdf";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FieldHeader({
  htmlFor,
  label,
  badge,
  required = true,
}: {
  htmlFor: string;
  label: string;
  badge?: string;
  required?: boolean;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-zk-text">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>
      {badge && (
        <span className="rounded-full bg-zk-surface2 px-2.5 py-0.5 text-xs font-medium text-zk-text2">
          {badge}
        </span>
      )}
    </div>
  );
}

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span className="font-mono text-xs tabular-nums text-zk-text2" aria-hidden="true">
      {value}/{max}
    </span>
  );
}

type ToolbarAction = {
  label: string;
  icon: typeof Bold;
  run: () => void;
};

export function NewMarketingTaskForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const uid = useId();

  // Core fields
  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [description, setDescription] = useState("");

  // Task type + points
  const [taskTypeId, setTaskTypeId] = useState(MOCK_TASK_TYPES[0].id);
  const [pointsInput, setPointsInput] = useState(String(MOCK_TASK_TYPES[0].points));
  const taskType = MOCK_TASK_TYPES.find((type) => type.id === taskTypeId) ?? MOCK_TASK_TYPES[0];

  // Description editor
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Attachments
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewNotice, setPreviewNotice] = useState("");

  /* ---------- Points ---------- */

  function setPoints(next: number, type: MarketingTaskType = taskType) {
    if (Number.isNaN(next)) return;
    setPointsInput(String(clamp(Math.round(next), type.points, type.maxPoints)));
  }

  function changeTaskType(nextId: string) {
    const nextType = MOCK_TASK_TYPES.find((type) => type.id === nextId);
    if (!nextType) return;
    setTaskTypeId(nextType.id);
    // Keep the current value when possible, otherwise pull it into the new range.
    setPoints(Number(pointsInput) || nextType.points, nextType);
  }

  const pointsValue = Number(pointsInput);
  const canDecrease = pointsValue > taskType.points;
  const canIncrease = pointsValue < taskType.maxPoints;

  /* ---------- Markdown toolbar ---------- */

  function updateDescription(
    transform: (value: string, start: number, end: number) => { value: string; start: number; end: number },
  ) {
    const el = descriptionRef.current;
    if (!el) return;
    const result = transform(el.value, el.selectionStart, el.selectionEnd);
    if (result.value.length > DESCRIPTION_MAX) return;
    setDescription(result.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.start, result.end);
    });
  }

  function wrapSelection(before: string, after = before, placeholder = "text") {
    updateDescription((value, start, end) => {
      const selected = value.slice(start, end) || placeholder;
      const next = value.slice(0, start) + before + selected + after + value.slice(end);
      return {
        value: next,
        start: start + before.length,
        end: start + before.length + selected.length,
      };
    });
  }

  function prefixLines(prefix: (index: number) => string) {
    updateDescription((value, start, end) => {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const nextBreak = value.indexOf("\n", end);
      const lineEnd = nextBreak === -1 ? value.length : nextBreak;
      const block = value.slice(lineStart, lineEnd);
      const prefixed = block
        .split("\n")
        .map((line, index) => prefix(index) + line)
        .join("\n");
      return {
        value: value.slice(0, lineStart) + prefixed + value.slice(lineEnd),
        start: lineStart,
        end: lineStart + prefixed.length,
      };
    });
  }

  const toolbar: ToolbarAction[][] = [
    [
      { label: "Bold", icon: Bold, run: () => wrapSelection("**") },
      { label: "Italic", icon: Italic, run: () => wrapSelection("_") },
      { label: "Strikethrough", icon: Strikethrough, run: () => wrapSelection("~~") },
    ],
    [
      { label: "Heading 1", icon: Heading1, run: () => prefixLines(() => "# ") },
      { label: "Heading 2", icon: Heading2, run: () => prefixLines(() => "## ") },
      { label: "Heading 3", icon: Heading3, run: () => prefixLines(() => "### ") },
    ],
    [
      { label: "Quote", icon: Quote, run: () => prefixLines(() => "> ") },
      { label: "Code", icon: Code, run: () => wrapSelection("`", "`", "code") },
      { label: "Bulleted list", icon: List, run: () => prefixLines(() => "- ") },
      { label: "Numbered list", icon: ListOrdered, run: () => prefixLines((i) => `${i + 1}. `) },
      { label: "Link", icon: Link2, run: () => wrapSelection("[", "](https://)", "link text") },
      { label: "Mention", icon: AtSign, run: () => wrapSelection("@", "", "") },
    ],
  ];

  /* ---------- Attachments ---------- */

  function addFiles(incoming: File[]) {
    if (incoming.length === 0) return;
    const problems: string[] = [];
    const accepted: File[] = [];

    for (const file of incoming) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        problems.push(`${file.name}: unsupported file type`);
      } else if (file.size > MAX_FILE_BYTES) {
        problems.push(`${file.name}: larger than 5 MB`);
      } else if (files.length + accepted.length >= MAX_FILES) {
        problems.push(`${file.name}: limit of ${MAX_FILES} files reached`);
      } else if (
        files.some((f) => f.name === file.name && f.size === file.size) ||
        accepted.some((f) => f.name === file.name && f.size === file.size)
      ) {
        problems.push(`${file.name}: already attached`);
      } else {
        accepted.push(file);
      }
    }

    if (accepted.length) setFiles((current) => [...current, ...accepted]);
    setFileError(problems.join(" · "));
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = ""; // allow re-selecting the same file after removal
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
    setFileError("");
  }

  /* ---------- Render ---------- */

  const ids = {
    title: `${uid}-title`,
    rationale: `${uid}-rationale`,
    rationaleHelp: `${uid}-rationale-help`,
    description: `${uid}-description`,
    descriptionHelp: `${uid}-description-help`,
    type: `${uid}-type`,
    points: `${uid}-points`,
    files: `${uid}-files`,
  };

  return (
    <form
      className="space-y-8 rounded-3xl border border-zk-border bg-zk-surface p-6 sm:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        setPreviewNotice("Task types and points are preview data until M-API-7 is merged.");
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* ---------------- Main column ---------------- */}
        <div className="space-y-7">
          {/* Title */}
          <div>
            <FieldHeader htmlFor={ids.title} label="Title" badge="Required" />
            <Input
              id={ids.title}
              name="title"
              required
              maxLength={TITLE_MAX}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Short summary of the task (e.g. Launch Web3 Creator Spotlight Campaign on Farcaster)"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-sm text-zk-text2">Be concise, actionable, and focus on expected outcome.</p>
              <Counter value={title.length} max={TITLE_MAX} />
            </div>
          </div>

          {/* Rationale */}
          <div>
            <FieldHeader htmlFor={ids.rationale} label="Rationale" badge="Strategic Impact" />
            <p id={ids.rationaleHelp} className="mb-2 text-sm text-zk-text2">
              How does this serve the current focus? Explain the target audience benefit or growth thesis.
            </p>
            <Textarea
              id={ids.rationale}
              name="rationale"
              required
              maxLength={RATIONALE_MAX}
              rows={4}
              value={rationale}
              onChange={(event) => setRationale(event.target.value)}
              aria-describedby={ids.rationaleHelp}
              placeholder="e.g. We experienced a 34% drop-off on community onboarding last week. This short video thread and playbook directly address friction for non-technical creators…"
            />
            <div className="mt-2 flex justify-end">
              <Counter value={rationale.length} max={RATIONALE_MAX} />
            </div>
          </div>

          {/* Description (markdown editor) */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor={ids.description} className="text-sm font-semibold text-zk-text">
                Description
                <span aria-hidden="true" className="ml-1 text-red-500">
                  *
                </span>
              </label>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-zk-text2">
                <Code className="h-3.5 w-3.5" aria-hidden="true" />
                Markdown supported
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zk-border bg-zk-surface2/40 focus-within:ring-2 focus-within:ring-zk-accent/40">
              {/* Tabs + toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zk-border bg-zk-surface2 px-3 py-2">
                <div role="tablist" aria-label="Description editor mode" className="flex rounded-full bg-zk-surface p-0.5">
                  {(["write", "preview"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={editorTab === tab}
                      onClick={() => setEditorTab(tab)}
                      className={`rounded-full px-3.5 py-1 text-sm font-medium capitalize transition-colors ${
                        editorTab === tab ? "bg-white text-zk-text shadow-sm" : "text-zk-text2 hover:text-zk-text"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {editorTab === "write" && (
                  <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5">
                    {toolbar.map((group, groupIndex) => (
                      <div key={groupIndex} className="flex items-center gap-0.5">
                        {groupIndex > 0 && <span aria-hidden="true" className="mx-1 h-4 w-px bg-zk-border" />}
                        {group.map(({ label, icon: Icon, run }) => (
                          <button
                            key={label}
                            type="button"
                            title={label}
                            aria-label={label}
                            onClick={run}
                            className="rounded-md p-1.5 text-zk-text2 transition-colors hover:bg-white hover:text-zk-text"
                          >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Write / Preview */}
              {editorTab === "write" ? (
                <Textarea
                  ref={descriptionRef}
                  id={ids.description}
                  name="description"
                  required
                  minLength={10}
                  maxLength={DESCRIPTION_MAX}
                  rows={12}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  aria-describedby={ids.descriptionHelp}
                  placeholder={"### Objective & Key Deliverables\n1. Draft 3 copy iterations focused on value prop.\n\n### Target Audience & Channels\n- Primary: …\n\n### Success Metrics"}
                  className="rounded-none border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0"
                />
              ) : (
                <div className="min-h-74 whitespace-pre-wrap wrap-break-word p-4 text-sm text-zk-text">
                  {description.trim() ? (
                    description
                  ) : (
                    <span className="text-zk-text2">Nothing to preview yet.</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-3 border-t border-zk-border bg-zk-surface2 px-4 py-2">
                <span className="text-xs text-zk-text2">Attach images by dragging &amp; dropping below</span>
                <Counter value={description.length} max={DESCRIPTION_MAX} />
              </div>
            </div>

            <p id={ids.descriptionHelp} className="mt-2 text-sm text-zk-text2">
              Be specific: what should happen, target audience, and how to execute it.
            </p>
          </div>

          {/* Attachments */}
          <section
            aria-labelledby={`${ids.files}-label`}
            className="rounded-2xl border border-zk-border bg-zk-surface2/40 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-zk-text2" aria-hidden="true" />
                <h2 id={`${ids.files}-label`} className="text-sm font-semibold text-zk-text">
                  Screenshots and files
                </h2>
              </div>
              <span className="rounded-full bg-zk-surface2 px-2.5 py-0.5 text-xs font-medium text-zk-text2">
                Optional
              </span>
            </div>
            <p className="mt-1 text-sm text-zk-text2">
              Attach mockups, copy drafts, or creative assets straight to the proposal.
            </p>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-3 transition-colors ${
                isDragging ? "border-zk-accent bg-zk-accent/5" : "border-zk-border"
              }`}
            >
              <input
                ref={fileInputRef}
                id={ids.files}
                type="file"
                multiple
                accept={ACCEPT_ATTR}
                onChange={handleFileInput}
                className="sr-only"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= MAX_FILES}
              >
                <Paperclip className="mr-2 h-4 w-4" aria-hidden="true" />
                Attach files
              </Button>
              <span className="text-sm text-zk-text2">
                {files.length ? `${files.length} of ${MAX_FILES} attached` : "No files selected…"}
              </span>
              <span className="ml-auto text-xs text-zk-text2">
                PNG, JPG, GIF, WebP, PDF. Up to 5 MB each, {MAX_FILES} per task.
              </span>
            </div>

            {fileError && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {fileError}
              </p>
            )}

            {files.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}`}
                    className="flex max-w-full items-center gap-2 rounded-full border border-zk-border bg-zk-surface px-3 py-1.5 text-sm"
                  >
                    {file.type.startsWith("image/") ? (
                      <ImageIcon className="h-4 w-4 shrink-0 text-zk-text2" aria-hidden="true" />
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-zk-text2" aria-hidden="true" />
                    )}
                    <span className="truncate text-zk-text">{file.name}</span>
                    <span className="shrink-0 text-xs text-zk-text2">({formatSize(file.size)})</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      aria-label={`Remove ${file.name}`}
                      className="shrink-0 rounded-full p-0.5 text-zk-text2 hover:bg-zk-surface2 hover:text-zk-text"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ---------------- Side column ---------------- */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="space-y-5 rounded-2xl border border-zk-border bg-zk-surface2/40 p-4">
            <div className="flex items-center justify-between gap-3 border-b border-zk-border pb-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-zk-text">
                <SlidersHorizontal className="h-4 w-4 text-zk-text2" aria-hidden="true" />
                Task Metadata
              </h2>
              <span className="rounded-full bg-zk-accent/10 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase text-zk-accent">
                v2.4 spec
              </span>
            </div>

            {/* Task type */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor={ids.type} className="text-sm font-semibold text-zk-text">
                  Task type
                  <span aria-hidden="true" className="ml-1 text-red-500">
                    *
                  </span>
                </label>
                <span className="text-xs text-zk-text2">Category</span>
              </div>
              <Select
                id={ids.type}
                name="typeId"
                value={taskType.id}
                onChange={(event) => changeTaskType(event.target.value)}
              >
                {MOCK_TASK_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
              <p className="mt-2 text-sm text-zk-text2">
                Classifies the discipline for reviewer routing and agent intake.
              </p>
            </div>

            {/* Points */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor={ids.points} className="text-sm font-semibold text-zk-text">
                  Points
                  <span aria-hidden="true" className="ml-1 text-red-500">
                    *
                  </span>
                </label>
                <span className="rounded-full bg-zk-accent/10 px-2 py-0.5 font-mono text-[11px] text-zk-accent">
                  Range unconfirmed
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  id={ids.points}
                  name="points"
                  type="number"
                  inputMode="numeric"
                  required
                  min={taskType.points}
                  max={taskType.maxPoints}
                  step={1}
                  value={pointsInput}
                  onChange={(event) => setPointsInput(event.target.value)}
                  onBlur={() => setPoints(Number(pointsInput) || taskType.points)}
                  aria-describedby={`${ids.points}-bounds`}
                />
                <div className="flex shrink-0 items-center gap-1 rounded-full bg-zk-surface p-1">
                  <button
                    type="button"
                    aria-label="Decrease points"
                    disabled={!canDecrease}
                    onClick={() => setPoints(pointsValue - 1)}
                    className="rounded-full p-1.5 text-zk-text hover:bg-zk-surface2 disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Increase points"
                    disabled={!canIncrease}
                    onClick={() => setPoints(pointsValue + 1)}
                    className="rounded-full p-1.5 text-zk-text hover:bg-zk-surface2 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div
                id={`${ids.points}-bounds`}
                className="mt-3 flex gap-2 rounded-xl bg-zk-surface2 p-3 text-sm"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-zk-accent" aria-hidden="true" />
                <div>
                  <p className="font-medium text-zk-text">
                    Bounds: [{taskType.points}] – [{taskType.maxPoints}]
                  </p>
                  <p className="mt-0.5 text-zk-text2">
                    Pending team confirmation — range unconfirmed until marketing steward triage.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Agent feedback note */}
          <div className="flex gap-3 rounded-2xl bg-zk-accent/5 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zk-surface">
              <Bot className="h-5 w-5 text-zk-text2" aria-hidden="true" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-zk-text">Agent Feedback Enabled</p>
              <p className="mt-0.5 text-zk-text2">
                Once proposed, Ziki Agent runs a 2-minute feasibility &amp; channel reach simulation before team
                sign-off.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {previewNotice && (
        <p role="status" className="text-sm text-zk-text2">
          {previewNotice}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">
          <Send className="mr-2 h-4 w-4" aria-hidden="true" />
          Propose task
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPreviewNotice("Drafts aren't saved yet — this is preview-only until the API is wired up.")}
        >
          Save draft
        </Button>
        <Button type="button" variant="ghost" className="ml-auto" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
