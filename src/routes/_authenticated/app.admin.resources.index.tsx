import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  downloadResource,
  isAllowedResourceFile,
  normaliseCategory,
  RESOURCES_ACCEPT_ATTR,
  RESOURCES_MAX_BYTES,
  useDeleteResource,
  useReplaceResourceFile,
  useResourceCategories,
  useResources,
  useUpdateResourceMeta,
  useUploadResource,
  type Resource,
} from "@/lib/useResources";

export const Route = createFileRoute("/_authenticated/app/admin/resources/")({
  component: ResourcesAdmin,
});

const OTHER = "Other";

function ResourcesAdmin() {
  const resources = useResources();
  const categories = useResourceCategories();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Resource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: Resource[] }>();
    for (const r of resources.data ?? []) {
      const name = (r.category ?? "").trim() || OTHER;
      const key = name.toLowerCase();
      const bucket = map.get(key) ?? { name, items: [] };
      bucket.items.push(r);
      map.set(key, bucket);
    }
    return [...map.values()].sort((a, b) => {
      if (a.name === OTHER) return 1;
      if (b.name === OTHER) return -1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }, [resources.data]);

  return (
    <div className="app-content py-16 flex flex-col gap-12">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl">Resources</h1>
          <p className="text-ink-muted text-sm">
            Downloadable worksheets, templates and one-pagers. All signed-in
            owners can view and download; only admins can manage.
          </p>
        </div>
        <div className="shrink-0">
          <Button
            className="motion-safe:active:scale-[0.97] motion-safe:transition-transform"
            onClick={() => setUploadOpen(true)}
          >
            Upload resource
          </Button>
        </div>
      </header>

      {resources.isLoading && <p className="text-ink-muted text-sm">Loading…</p>}

      {!resources.isLoading && groups.length === 0 && (
        <p className="text-ink-muted text-sm">
          No resources yet. Upload your first PDF or Word file.
        </p>
      )}

      <div className="flex flex-col gap-10">
        {groups.map((g) => (
          <section key={g.name} className="flex flex-col gap-3">
            <h2
              className="text-xl font-medium text-ink"
              style={{ letterSpacing: "-0.01em" }}
            >
              {g.name}
              <span className="text-ink-muted text-sm font-normal ml-2">
                ({g.items.length})
              </span>
            </h2>
            <ul className="flex flex-col divide-y divide-border border border-border rounded-xl list-none">
              {g.items.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between px-5 py-4 gap-4"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-ink text-sm truncate">{r.title}</span>
                    <span className="text-ink-muted text-xs truncate">
                      {r.file_name} · {formatBytes(r.file_size)}
                      {r.description ? ` · ${r.description}` : ""}
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="motion-safe:active:scale-[0.97] motion-safe:transition-transform"
                      onClick={() => downloadResource(r)}
                    >
                      <Download className="size-4" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="motion-safe:active:scale-[0.97] motion-safe:transition-transform"
                      onClick={() => setEditTarget(r)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[var(--red)] hover:text-[var(--red)] motion-safe:active:scale-[0.97] motion-safe:transition-transform"
                      onClick={() => setDeleteTarget(r)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <UploadResourceDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        categories={categories}
      />

      <EditResourceDialog
        resource={editTarget}
        onClose={() => setEditTarget(null)}
        categories={categories}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the resource and its file permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <DeleteResourceAction
              resource={deleteTarget}
              onDone={() => setDeleteTarget(null)}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/* ---------- Category combobox ---------- */

function CategoryCombobox({
  id,
  value,
  onChange,
  categories,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  categories: string[];
}) {
  const listId = `${id}-options`;
  const typed = value.trim().toLowerCase();
  const suggestions = typed
    ? categories.filter((c) => c.toLowerCase().includes(typed))
    : categories;
  const exists = categories.some((c) => c.toLowerCase() === typed);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Category</Label>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Pick an existing one or type a new one"
        maxLength={120}
        autoComplete="off"
      />
      <datalist id={listId}>
        {suggestions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <p className="text-xs text-ink-muted">
        {typed
          ? exists
            ? "Using an existing category."
            : "This will create a new category."
          : "Leave blank to file it under “Other”."}
      </p>
    </div>
  );
}

/* ---------- Upload dialog ---------- */

function UploadResourceDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: string[];
}) {
  const upload = useUploadResource();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setCategory("");
    setFile(null);
    setErr(null);
  }

  async function submit() {
    setErr(null);
    if (!title.trim()) return setErr("Give it a title.");
    if (!file) return setErr("Choose a PDF or Word file.");
    if (file.size > RESOURCES_MAX_BYTES) return setErr("File is over 20MB.");
    if (!isAllowedResourceFile(file)) {
      return setErr("Only PDF or Word (.docx) files are allowed.");
    }
    try {
      await upload.mutateAsync({
        category: normaliseCategory(category, categories),
        title,
        description: description || null,
        file,
      });
      reset();
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload resource</DialogTitle>
          <DialogDescription>PDF or Word, up to 20MB.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="res-title">Title</Label>
            <Input
              id="res-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="res-desc">Description (optional)</Label>
            <Textarea
              id="res-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>
          <CategoryCombobox
            id="res-category"
            value={category}
            onChange={setCategory}
            categories={categories}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="res-file">File (PDF or Word)</Label>
            <input
              id="res-file"
              type="file"
              accept={RESOURCES_ACCEPT_ATTR}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-ink file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-border file:bg-background file:text-ink file:text-sm hover:file:bg-[var(--surface-raised)]"
            />
          </div>
          {err && <p className="text-[var(--red)] text-sm">{err}</p>}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={upload.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={upload.isPending}
            className="motion-safe:active:scale-[0.97] motion-safe:transition-transform"
          >
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Edit dialog ---------- */

function EditResourceDialog({
  resource,
  onClose,
  categories,
}: {
  resource: Resource | null;
  onClose: () => void;
  categories: string[];
}) {
  const update = useUpdateResourceMeta();
  const replace = useReplaceResourceFile();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useMemoizedReset(resource, () => {
    setTitle(resource?.title ?? "");
    setDescription(resource?.description ?? "");
    setCategory(resource?.category ?? "");
    setFile(null);
    setErr(null);
  });

  async function save() {
    if (!resource) return;
    setErr(null);
    if (!title.trim()) return setErr("Title is required.");
    try {
      await update.mutateAsync({
        id: resource.id,
        title,
        description: description.trim() || null,
        category: normaliseCategory(category, categories),
      });
      if (file) {
        await replace.mutateAsync({ resource, file });
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    }
  }

  const pending = update.isPending || replace.isPending;

  return (
    <Dialog open={!!resource} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit resource</DialogTitle>
          <DialogDescription>
            Update details or replace the file.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="res-edit-title">Title</Label>
            <Input
              id="res-edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="res-edit-desc">Description</Label>
            <Textarea
              id="res-edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>
          <CategoryCombobox
            id="res-edit-category"
            value={category}
            onChange={setCategory}
            categories={categories}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor="res-edit-file">Replace file (optional)</Label>
            <input
              id="res-edit-file"
              type="file"
              accept={RESOURCES_ACCEPT_ATTR}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-ink file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-border file:bg-background file:text-ink file:text-sm hover:file:bg-[var(--surface-raised)]"
            />
            {resource && (
              <p className="text-xs text-ink-muted">
                Current: {resource.file_name} · {formatBytes(resource.file_size)}
              </p>
            )}
          </div>
          {err && <p className="text-[var(--red)] text-sm">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={pending}
            className="motion-safe:active:scale-[0.97] motion-safe:transition-transform"
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Tiny helper to run an initializer whenever `key` identity changes.
function useMemoizedReset<T>(key: T, run: () => void) {
  useMemo(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

function DeleteResourceAction({
  resource,
  onDone,
}: {
  resource: Resource | null;
  onDone: () => void;
}) {
  const del = useDeleteResource();
  return (
    <AlertDialogAction
      disabled={del.isPending || !resource}
      onClick={async (e) => {
        e.preventDefault();
        if (!resource) return;
        try {
          await del.mutateAsync(resource.id);
        } finally {
          onDone();
        }
      }}
      className="bg-[var(--red)] text-white hover:bg-[var(--red)]/90"
    >
      {del.isPending ? "Deleting…" : "Delete resource"}
    </AlertDialogAction>
  );
}
