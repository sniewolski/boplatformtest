import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONTENT_CATEGORIES, type ContentInputType } from "./config";
import { useUploadAsset } from "./useContentReview";

const FILE_EXT_TO_TYPE: Record<string, Exclude<ContentInputType, "text">> = {
  pdf: "pdf",
  md: "md",
  markdown: "md",
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  gif: "image",
};

const ACCEPT = ".pdf,.md,.markdown,.png,.jpg,.jpeg,.webp,.gif";
const MAX_BYTES = 20 * 1024 * 1024;

export function UploadDialog({
  open,
  onOpenChange,
  ownerId,
  defaultCategory,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  ownerId: string;
  defaultCategory?: string;
}) {
  const upload = useUploadAsset();
  const [category, setCategory] = useState(defaultCategory ?? CONTENT_CATEGORIES[0].key);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"text" | "file">("text");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setBody("");
    setFile(null);
    setMode("text");
    setErr(null);
  }

  async function submit() {
    setErr(null);
    const t = title.trim();
    if (!t) return setErr("Give it a title.");
    if (mode === "text") {
      if (!body.trim()) return setErr("Paste the content.");
      try {
        await upload.mutateAsync({
          ownerId,
          category,
          title: t,
          kind: "text",
          body,
        });
        reset();
        onOpenChange(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Upload failed.");
      }
      return;
    }
    if (!file) return setErr("Choose a file.");
    if (file.size > MAX_BYTES) return setErr("File is over 20MB.");
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const inputType = FILE_EXT_TO_TYPE[ext];
    if (!inputType) return setErr("Unsupported file type.");
    try {
      await upload.mutateAsync({
        ownerId,
        category,
        title: t,
        kind: "file",
        file,
        inputType,
      });
      reset();
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a piece of content</DialogTitle>
          <DialogDescription>
            Paste a script, message or cadence — or upload a PDF, markdown file, or image.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-sm">
            <label htmlFor="upload-category" className="text-ink-muted">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                id="upload-category"
                className="h-10 rounded-xl border-border bg-background text-ink text-sm pr-3 focus:ring-2 focus:ring-ring motion-safe:transition-colors motion-safe:duration-150"
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border bg-popover text-popover-foreground shadow-md p-1">
                {CONTENT_CATEGORIES.map((c) => (
                  <SelectItem
                    key={c.key}
                    value={c.key}
                    className="rounded-lg pl-2 pr-8 py-1.5 text-sm text-ink data-[highlighted]:bg-[var(--red-tint)] data-[highlighted]:text-[var(--red)] data-[state=checked]:text-[var(--red)] focus:bg-[var(--red-tint)] focus:text-[var(--red)]"
                  >
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-ink-muted">Title</span>
              {title.length >= 60 && (
                <span
                  className="text-xs tabular-nums"
                  style={{ color: title.length >= 80 ? "var(--red)" : "var(--ink-muted)" }}
                >
                  {title.length}/80
                </span>
              )}
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="e.g. Cold opener — agency v3"
              className="h-10 px-3 rounded-xl border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setMode("text")}
              className={`px-3 h-8 rounded-full border transition-colors ${mode === "text" ? "border-ink text-ink" : "border-border text-ink-muted hover:text-ink"}`}
            >
              Paste text
            </button>
            <button
              type="button"
              onClick={() => setMode("file")}
              className={`px-3 h-8 rounded-full border transition-colors ${mode === "file" ? "border-ink text-ink" : "border-border text-ink-muted hover:text-ink"}`}
            >
              Upload file
            </button>
          </div>

          {mode === "text" ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-ink-muted">Content</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder="Paste the message, script, or cadence here…"
                className="px-3 py-2 rounded-xl border border-border bg-background text-ink text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-ink-muted">File (PDF, MD, PNG/JPG, max 20MB)</span>
              <input
                type="file"
                accept={ACCEPT}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-ink file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-border file:bg-background file:text-ink file:text-sm hover:file:bg-[var(--surface-raised)]"
              />
            </label>
          )}

          {err && <p className="text-[var(--red)] text-sm">{err}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={upload.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={upload.isPending}>
            {upload.isPending ? "Uploading…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
