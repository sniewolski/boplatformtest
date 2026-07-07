import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sop,
  SopFolder,
  SOPS_ACCEPT_ATTR,
  SOPS_MAX_BYTES,
  isAllowedSopFile,
  useCreateFolder,
  useDeleteFolder,
  useDeleteSop,
  useRenameFolder,
  useReplaceSopFile,
  useSopFolders,
  useSops,
  useUpdateSopMeta,
  useUploadSop,
} from "@/lib/useSops";


export const Route = createFileRoute("/_authenticated/app/admin/sops/")({
  component: SopsAdmin,
});

const UNASSIGNED = "__unassigned__";

function SopsAdmin() {
  const folders = useSopFolders();
  const sops = useSops();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDefaultFolder, setUploadDefaultFolder] = useState<string | null>(null);
  const [folderDialog, setFolderDialog] = useState<
    | { mode: "create" }
    | { mode: "rename"; folder: SopFolder }
    | null
  >(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<SopFolder | null>(null);
  const [editSop, setEditSop] = useState<Sop | null>(null);
  const [deleteSopTarget, setDeleteSopTarget] = useState<Sop | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string | null, Sop[]>();
    for (const s of sops.data ?? []) {
      const arr = map.get(s.folder_id) ?? [];
      arr.push(s);
      map.set(s.folder_id, arr);
    }
    return map;
  }, [sops.data]);

  return (
    <div className="app-content py-16 flex flex-col gap-12">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl">SOPs</h1>
          <p className="text-ink-muted text-sm">
            Shared, read-only library of standard operating procedures. All
            signed-in owners can view; only admins can manage.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => setFolderDialog({ mode: "create" })}>
            New folder
          </Button>
          <Button
            onClick={() => {
              setUploadDefaultFolder(null);
              setUploadOpen(true);
            }}
          >
            Upload SOP
          </Button>
        </div>
      </header>

      {(folders.isLoading || sops.isLoading) && (
        <p className="text-ink-muted text-sm">Loading…</p>
      )}

      <div className="flex flex-col gap-8">
        {(folders.data ?? []).map((f) => (
          <FolderSection
            key={f.id}
            folder={f}
            sops={grouped.get(f.id) ?? []}
            onAdd={() => {
              setUploadDefaultFolder(f.id);
              setUploadOpen(true);
            }}
            onRename={() => setFolderDialog({ mode: "rename", folder: f })}
            onDelete={() => setDeleteFolderTarget(f)}
            onEditSop={setEditSop}
            onDeleteSop={setDeleteSopTarget}
          />
        ))}

        {(grouped.get(null)?.length ?? 0) > 0 && (
          <FolderSection
            folder={null}
            sops={grouped.get(null) ?? []}
            onAdd={() => {
              setUploadDefaultFolder(null);
              setUploadOpen(true);
            }}
            onEditSop={setEditSop}
            onDeleteSop={setDeleteSopTarget}
          />
        )}

        {(folders.data ?? []).length === 0 && (sops.data ?? []).length === 0 && (
          <p className="text-ink-muted text-sm">
            No folders or SOPs yet. Start by creating a folder or uploading an SOP.
          </p>
        )}
      </div>

      <UploadSopDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        folders={folders.data ?? []}
        defaultFolderId={uploadDefaultFolder}
      />

      <FolderDialog
        state={folderDialog}
        onClose={() => setFolderDialog(null)}
      />

      <AlertDialog
        open={!!deleteFolderTarget}
        onOpenChange={(o) => !o && setDeleteFolderTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder "{deleteFolderTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              SOPs inside this folder will move to Uncategorized. The folder
              itself will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <DeleteFolderAction
              folder={deleteFolderTarget}
              onDone={() => setDeleteFolderTarget(null)}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditSopDialog
        sop={editSop}
        onClose={() => setEditSop(null)}
        folders={folders.data ?? []}
      />

      <AlertDialog
        open={!!deleteSopTarget}
        onOpenChange={(o) => !o && setDeleteSopTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteSopTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the SOP and its file permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <DeleteSopAction
              sop={deleteSopTarget}
              onDone={() => setDeleteSopTarget(null)}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FolderSection({
  folder,
  sops,
  onAdd,
  onRename,
  onDelete,
  onEditSop,
  onDeleteSop,
}: {
  folder: SopFolder | null;
  sops: Sop[];
  onAdd: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onEditSop: (s: Sop) => void;
  onDeleteSop: (s: Sop) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg text-ink">
          {folder ? folder.name : "Uncategorized"}
          <span className="text-ink-muted text-sm ml-2">({sops.length})</span>
        </h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onAdd}>
            Add
          </Button>
          {folder && onRename && (
            <Button variant="ghost" size="sm" onClick={onRename}>
              Rename
            </Button>
          )}
          {folder && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-[var(--red)] hover:text-[var(--red)]"
            >
              Delete
            </Button>
          )}
        </div>
      </div>
      {sops.length === 0 ? (
        <p className="text-ink-muted text-sm">No SOPs in this folder.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border border border-border rounded-xl">
          {sops.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-5 py-4 gap-4">
              <div className="flex flex-col min-w-0">
                <span className="text-ink text-sm truncate">{s.title}</span>
                <span className="text-ink-muted text-xs truncate">
                  {s.file_name} · {formatBytes(s.file_size)}
                  {s.description ? ` · ${s.description}` : ""}
                </span>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => onEditSop(s)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[var(--red)] hover:text-[var(--red)]"
                  onClick={() => onDeleteSop(s)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/* ---------- Upload dialog ---------- */

function UploadSopDialog({
  open,
  onOpenChange,
  folders,
  defaultFolderId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  folders: SopFolder[];
  defaultFolderId: string | null;
}) {
  const upload = useUploadSop();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState<string>(defaultFolderId ?? UNASSIGNED);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setFolderId(defaultFolderId ?? UNASSIGNED);
    setFile(null);
    setErr(null);
  }

  async function submit() {
    setErr(null);
    if (!title.trim()) return setErr("Give it a title.");
    if (!file) return setErr("Choose a PDF.");
    if (file.size > SOPS_MAX_BYTES) return setErr("File is over 20MB.");
    if (!/\.pdf$/i.test(file.name) || file.type !== "application/pdf") {
      return setErr("Only PDF files are allowed.");
    }
    try {
      await upload.mutateAsync({
        folderId: folderId === UNASSIGNED ? null : folderId,
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
          <DialogTitle>Upload SOP</DialogTitle>
          <DialogDescription>PDF only, up to 20MB.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sop-title">Title</Label>
            <Input
              id="sop-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sop-desc">Description (optional)</Label>
            <Textarea
              id="sop-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sop-folder">Folder</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger id="sop-folder">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Uncategorized</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sop-file">PDF file</Label>
            <input
              id="sop-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-ink file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-border file:bg-background file:text-ink file:text-sm hover:file:bg-[var(--surface-raised)]"
            />
          </div>
          {err && <p className="text-[var(--red)] text-sm">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={upload.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={upload.isPending}>
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Edit SOP dialog ---------- */

function EditSopDialog({
  sop,
  onClose,
  folders,
}: {
  sop: Sop | null;
  onClose: () => void;
  folders: SopFolder[];
}) {
  const update = useUpdateSopMeta();
  const replace = useReplaceSopFile();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [folderId, setFolderId] = useState<string>(UNASSIGNED);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Reset local state when target sop changes.
  useMemoizedReset(sop, () => {
    setTitle(sop?.title ?? "");
    setDescription(sop?.description ?? "");
    setFolderId(sop?.folder_id ?? UNASSIGNED);
    setFile(null);
    setErr(null);
  });

  async function save() {
    if (!sop) return;
    setErr(null);
    if (!title.trim()) return setErr("Title is required.");
    try {
      await update.mutateAsync({
        id: sop.id,
        title,
        description: description.trim() || null,
        folder_id: folderId === UNASSIGNED ? null : folderId,
      });
      if (file) {
        await replace.mutateAsync({ sop, file });
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    }
  }

  const pending = update.isPending || replace.isPending;

  return (
    <Dialog open={!!sop} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit SOP</DialogTitle>
          <DialogDescription>Update metadata or replace the PDF.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-folder">Folder</Label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger id="edit-folder">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Uncategorized</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-file">Replace file (optional)</Label>
            <input
              id="edit-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-ink file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-border file:bg-background file:text-ink file:text-sm hover:file:bg-[var(--surface-raised)]"
            />
            {sop && (
              <p className="text-xs text-ink-muted">
                Current: {sop.file_name} · {formatBytes(sop.file_size)}
              </p>
            )}
          </div>
          {err && <p className="text-[var(--red)] text-sm">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending}>
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

/* ---------- Folder create/rename dialog ---------- */

function FolderDialog({
  state,
  onClose,
}: {
  state: { mode: "create" } | { mode: "rename"; folder: SopFolder } | null;
  onClose: () => void;
}) {
  const create = useCreateFolder();
  const rename = useRenameFolder();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useMemoizedReset(state, () => {
    setName(state?.mode === "rename" ? state.folder.name : "");
    setErr(null);
  });

  async function submit() {
    setErr(null);
    if (!name.trim()) return setErr("Name is required.");
    try {
      if (state?.mode === "create") {
        await create.mutateAsync(name);
      } else if (state?.mode === "rename") {
        await rename.mutateAsync({ id: state.folder.id, name });
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    }
  }

  const pending = create.isPending || rename.isPending;

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {state?.mode === "rename" ? "Rename folder" : "New folder"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="folder-name">Name</Label>
          <Input
            id="folder-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoFocus
          />
          {err && <p className="text-[var(--red)] text-sm">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Confirm-delete action buttons ---------- */

function DeleteFolderAction({
  folder,
  onDone,
}: {
  folder: SopFolder | null;
  onDone: () => void;
}) {
  const del = useDeleteFolder();
  return (
    <AlertDialogAction
      disabled={del.isPending || !folder}
      onClick={async (e) => {
        e.preventDefault();
        if (!folder) return;
        try {
          await del.mutateAsync(folder.id);
        } finally {
          onDone();
        }
      }}
      className="bg-[var(--red)] text-white hover:bg-[var(--red)]/90"
    >
      {del.isPending ? "Deleting…" : "Delete folder"}
    </AlertDialogAction>
  );
}

function DeleteSopAction({ sop, onDone }: { sop: Sop | null; onDone: () => void }) {
  const del = useDeleteSop();
  return (
    <AlertDialogAction
      disabled={del.isPending || !sop}
      onClick={async (e) => {
        e.preventDefault();
        if (!sop) return;
        try {
          await del.mutateAsync(sop.id);
        } finally {
          onDone();
        }
      }}
      className="bg-[var(--red)] text-white hover:bg-[var(--red)]/90"
    >
      {del.isPending ? "Deleting…" : "Delete SOP"}
    </AlertDialogAction>
  );
}
