import { useRef, useState } from "react";
import { FileText, Link2, Loader2 } from "lucide-react";
import type { SosaField, SosaQuestion } from "../../config/questionBank";
import type { SosaFieldValue, SosaUploadItem } from "../../types";
import type { SosaAnswerApi } from "../../data/sosaAnswers";
import { useSosaAnswers } from "../../data/sosaAnswers";
import {
  SOSA_ALLOWED_EXTENSIONS,
  SosaUploadError,
  getSosaFileUrl,
  removeSosaFile,
  uploadSosaFile,
} from "../../data/sosaUploads";
import { Button } from "@/components/ui/button";

type UploadFieldDef = Extract<SosaField, { type: "upload" }>;

const inputCls =
  "h-9 px-3 rounded-xl border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const ACCEPT = SOSA_ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",");

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function linkName(item: Extract<SosaUploadItem, { kind: "link" }>) {
  if (item.name?.trim()) return item.name;
  try {
    return new URL(item.url).hostname;
  } catch {
    return item.url;
  }
}

function ItemRow({ item, onRemove }: { item: SosaUploadItem; onRemove: () => void }) {
  const [err, setErr] = useState<string | null>(null);
  const open = async () => {
    setErr(null);
    if (item.kind === "link") {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }
    const w = window.open("", "_blank");
    try {
      const url = await getSosaFileUrl(item.path);
      if (w) {
        w.opener = null;
        w.location.href = url;
      } else window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      w?.close();
      setErr("Couldn't open this file. Try again.");
    }
  };
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
        {item.kind === "file" ? (
          <FileText className="size-4 text-ink-muted shrink-0" aria-hidden />
        ) : (
          <Link2 className="size-4 text-ink-muted shrink-0" aria-hidden />
        )}
        <span className="flex-1 min-w-0 truncate text-sm text-ink">
          {item.kind === "file" ? item.name : linkName(item)}
        </span>
        {item.kind === "file" && <span className="text-xs text-ink-muted tabular-nums shrink-0">{fmtSize(item.size)}</span>}
        <Button type="button" variant="ghost" size="sm" onClick={open}>
          Open
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
      {err && <p className="text-sm text-ink-muted" role="alert">{err}</p>}
    </div>
  );
}

function LinkForm({ onAdd, onCancel }: { onAdd: (url: string, name?: string) => void; onCancel: () => void }) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) return setErr("Enter a full link starting with https://");
    onAdd(u, name.trim() || undefined);
  };
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
      <div className="flex flex-wrap gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setErr(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())}
          placeholder="https://"
          aria-label="Link"
          aria-invalid={!!err}
          className={`flex-1 min-w-[220px] ${inputCls}`}
          autoFocus
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())}
          placeholder="Name (optional)"
          aria-label="Name (optional)"
          className={`w-48 ${inputCls}`}
        />
      </div>
      {err && <p className="text-sm text-ink-muted" role="alert">{err}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={submit}>
          Add link
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Upload / link controls for one area (the whole field, or one slot). */
function AddControls({
  multiple,
  onFiles,
  onLink,
  busy,
}: {
  multiple: boolean;
  onFiles: (files: File[]) => void;
  onLink: (url: string, name?: string) => void;
  busy: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      {busy && (
        <p className="flex items-center gap-2 text-sm text-ink-muted" role="status">
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> Uploading… {busy}
        </p>
      )}
      {linkOpen ? (
        <LinkForm
          onAdd={(u, n) => {
            onLink(u, n);
            setLinkOpen(false);
          }}
          onCancel={() => setLinkOpen(false)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            tabIndex={-1}
            accept={ACCEPT}
            multiple={multiple}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length) onFiles(files);
            }}
          />
          <Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={() => inputRef.current?.click()}>
            Upload file
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setLinkOpen(true)}>
            Add link
          </Button>
        </div>
      )}
    </div>
  );
}

export function UploadField({
  question,
  field,
  api,
}: {
  question: SosaQuestion;
  field: UploadFieldDef;
  api: SosaAnswerApi;
}) {
  const { answers } = useSosaAnswers();
  const { setFieldValue } = api;
  const [busy, setBusy] = useState<Record<string, string | null>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // Always read the latest stored items (uploads finish after other edits may land).
  const currentItems = (): SosaUploadItem[] => {
    const v = answers?.[question.id]?.value[field.key];
    return v && typeof v === "object" && "items" in v ? (v.items as SosaUploadItem[]) : [];
  };
  const latest = useRef(currentItems);
  latest.current = currentItems;
  const save = (items: SosaUploadItem[]) => setFieldValue(field.key, { items } as SosaFieldValue);

  const items = currentItems();
  const AREA = "__all__";

  const addItem = (item: SosaUploadItem, slot?: string) => {
    let next = latest.current();
    if (slot) {
      const old = next.find((i) => i.slot === slot);
      next = next.filter((i) => i.slot !== slot);
      if (old?.kind === "file") void removeSosaFile(old.path);
    }
    save([...next, slot ? { ...item, slot } : item]);
  };

  const uploadFiles = async (files: File[], slot?: string) => {
    const area = slot ?? AREA;
    setErrors((e) => ({ ...e, [area]: null }));
    for (const file of files) {
      setBusy((b) => ({ ...b, [area]: file.name }));
      try {
        const item = await uploadSosaFile(question.id, file);
        addItem(item, slot);
      } catch (e) {
        const msg = e instanceof SosaUploadError ? e.message : "Upload failed. Try again, or paste a link instead.";
        setErrors((er) => ({ ...er, [area]: files.length > 1 ? `${file.name}: ${msg}` : msg }));
      }
    }
    setBusy((b) => ({ ...b, [area]: null }));
  };

  const addLink = (url: string, name: string | undefined, slot?: string) => {
    setErrors((e) => ({ ...e, [slot ?? AREA]: null }));
    addItem({ id: crypto.randomUUID(), kind: "link", url, ...(name ? { name } : {}) }, slot);
  };

  const remove = (item: SosaUploadItem) => {
    save(latest.current().filter((i) => i.id !== item.id));
    if (item.kind === "file") void removeSosaFile(item.path);
  };

  const errLine = (area: string) =>
    errors[area] ? (
      <p className="text-sm text-ink-muted" role="alert">
        {errors[area]}
      </p>
    ) : null;

  return (
    <div className="flex flex-col gap-3">
      {field.slots && field.slots.length > 0 ? (
        <div className="flex flex-col gap-4">
          {field.slots.map((s) => {
            const item = items.find((i) => i.slot === s.key);
            return (
              <div key={s.key} className="flex flex-col gap-2">
                <span className="text-sm text-ink">{s.label}</span>
                {item ? (
                  <ItemRow item={item} onRemove={() => remove(item)} />
                ) : (
                  <AddControls
                    multiple={false}
                    busy={busy[s.key] ?? null}
                    onFiles={(f) => void uploadFiles(f.slice(0, 1), s.key)}
                    onLink={(u, n) => addLink(u, n, s.key)}
                  />
                )}
                {errLine(s.key)}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {items.length > 0 && (
            <div className="flex flex-col gap-2">
              {items.map((i) => (
                <ItemRow key={i.id} item={i} onRemove={() => remove(i)} />
              ))}
            </div>
          )}
          <AddControls
            multiple
            busy={busy[AREA] ?? null}
            onFiles={(f) => void uploadFiles(f)}
            onLink={(u, n) => addLink(u, n)}
          />
          {errLine(AREA)}
        </>
      )}
      <p className="text-xs text-ink-muted">
        Files up to 50 MB. For call recordings, pasting a link (Fathom, Gong, Zoom, Loom, Google Drive) is usually easier.
      </p>
    </div>
  );
}
