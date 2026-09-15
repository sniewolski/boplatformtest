import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { MarkdownBody } from "@/components/MarkdownBody";
import { resolveWistiaEmbed } from "@/tools/watch-first/wistia";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/admin/watch-first")({
  component: WatchFirstAdmin,
});

type Lesson = {
  id: string;
  title: string;
  video_embed_url: string | null;
  body_markdown: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

const QUERY_KEY = ["admin", "watch-first-lessons"] as const;
const BUCKET = "watch-first-images";

type Draft = {
  title: string;
  video_embed_url: string;
  body_markdown: string;
  sort_order: string;
  is_published: boolean;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  video_embed_url: "",
  body_markdown: "",
  sort_order: "0",
  is_published: false,
};

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
}

function WatchFirstAdmin() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const lessonsQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<Lesson[]> => {
      const { data, error } = await supabase
        .from("watch_first_lessons")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Lesson[];
    },
  });

  const lessons = useMemo(() => lessonsQuery.data ?? [], [lessonsQuery.data]);

  useEffect(() => {
    if (isNew || !selectedId) return;
    const lesson = lessons.find((l) => l.id === selectedId);
    if (!lesson) return;
    setDraft({
      title: lesson.title,
      video_embed_url: lesson.video_embed_url ?? "",
      body_markdown: lesson.body_markdown ?? "",
      sort_order: String(lesson.sort_order),
      is_published: lesson.is_published,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: draft.title.trim(),
        video_embed_url: draft.video_embed_url.trim() || null,
        body_markdown: draft.body_markdown || null,
        sort_order: Number.isFinite(Number(draft.sort_order))
          ? Number(draft.sort_order)
          : 0,
        is_published: draft.is_published,
      };
      if (!payload.title) throw new Error("Title is required");
      if (isNew || !selectedId) {
        const { data, error } = await supabase
          .from("watch_first_lessons")
          .insert(payload)
          .select("*")
          .single();
        if (error) throw error;
        return (data as Lesson).id;
      }
      const { error } = await supabase
        .from("watch_first_lessons")
        .update(payload)
        .eq("id", selectedId);
      if (error) throw error;
      return selectedId;
    },
    onSuccess: (id) => {
      setIsNew(false);
      setSelectedId(id);
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Lesson saved");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not save lesson"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      const { error } = await supabase
        .from("watch_first_lessons")
        .delete()
        .eq("id", selectedId);
      if (error) throw error;
    },
    onSuccess: () => {
      setConfirmDelete(false);
      setSelectedId(null);
      setIsNew(false);
      setDraft(EMPTY_DRAFT);
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Lesson deleted");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not delete lesson"),
  });

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadedUrl(null);
    try {
      const path = `${new Date().getFullYear()}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setUploadedUrl(data.publicUrl);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const editing = isNew || !!selectedId;

  return (
    <div className="app-content py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Watch First</h1>
          <p className="text-sm text-ink-muted">
            Author onboarding lessons. Drafts are hidden from owners.
          </p>
        </div>
        <Button
          onClick={() => {
            setIsNew(true);
            setSelectedId(null);
            setDraft(EMPTY_DRAFT);
            setUploadedUrl(null);
          }}
        >
          <Plus className="size-4" />
          New lesson
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr] items-start">
        {/* ---------------- list ---------------- */}
        <div className="rounded-lg border border-border bg-surface">
          {lessonsQuery.isLoading ? (
            <div className="p-4 text-sm text-ink-muted">Loading…</div>
          ) : lessons.length === 0 ? (
            <div className="p-4 text-sm text-ink-muted">No lessons yet.</div>
          ) : (
            <ul className="divide-y divide-border">
              {lessons.map((lesson) => {
                const active = !isNew && lesson.id === selectedId;
                return (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNew(false);
                        setSelectedId(lesson.id);
                        setUploadedUrl(null);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-3 transition-colors hover:bg-background",
                        active && "bg-background",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-sm text-ink truncate",
                            !lesson.is_published && "italic text-ink-muted",
                          )}
                        >
                          {lesson.title || "Untitled"}
                        </span>
                        <span className="text-xs text-ink-muted shrink-0">
                          #{lesson.sort_order}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-medium",
                          lesson.is_published
                            ? "bg-background text-ink-muted"
                            : "border border-dashed border-border text-ink-muted",
                        )}
                      >
                        {lesson.is_published ? "Published" : "Draft"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ---------------- editor ---------------- */}
        {!editing ? (
          <div className="rounded-lg border border-border bg-surface p-6 text-sm text-ink-muted">
            Select a lesson on the left, or create a new one.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface p-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wf-title">Title</Label>
              <Input
                id="wf-title"
                value={draft.title}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, title: e.target.value }))
                }
                placeholder="Lesson title"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="wf-video">Video — Wistia embed code or URL</Label>
              <Input
                id="wf-video"
                value={draft.video_embed_url}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, video_embed_url: e.target.value }))
                }
                placeholder="Paste the Wistia embed code, share URL, or media id…"
              />
              {(() => {
                const id = resolveWistiaEmbed(draft.video_embed_url);
                if (id) {
                  return (
                    <p className="text-xs text-ink-muted">
                      Wistia video detected — id{" "}
                      <span className="font-mono">{id}</span>
                    </p>
                  );
                }
                return draft.video_embed_url.trim() ? (
                  <p className="text-xs text-ink-muted">
                    No Wistia video detected in that text yet.
                  </p>
                ) : null;
              })()}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="wf-body">Body (markdown)</Label>
              <Textarea
                id="wf-body"
                value={draft.body_markdown}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, body_markdown: e.target.value }))
                }
                rows={14}
                className="font-mono text-xs"
              />
              <div className="mt-2 rounded-md border border-border bg-background p-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                  Preview
                </div>
                <MarkdownBody>{draft.body_markdown}</MarkdownBody>
              </div>
            </div>

            {/* image uploader */}
            <div className="rounded-md border border-border p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                <ImagePlus className="size-4" />
                Lesson image
              </div>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void handleUpload(file);
                }}
                className="text-sm text-ink-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:text-ink"
              />
              {uploading && (
                <div className="flex items-center gap-2 text-xs text-ink-muted">
                  <Loader2 className="size-3 animate-spin" />
                  Uploading…
                </div>
              )}
              {uploadedUrl && (
                <div className="flex items-center gap-2">
                  <Input readOnly value={uploadedUrl} className="text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(`![](${uploadedUrl})`);
                      toast.success("Markdown image code copied");
                    }}
                  >
                    <Copy className="size-4" />
                    Copy
                  </Button>
                </div>
              )}
              <p className="text-xs text-ink-muted">
                Paste straight into the body — it's already wrapped as{" "}
                <code>![alt](url)</code>.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="wf-sort">Sort order</Label>
                <Input
                  id="wf-sort"
                  type="number"
                  className="w-28"
                  value={draft.sort_order}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, sort_order: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-3 pb-2">
                <Switch
                  id="wf-published"
                  checked={draft.is_published}
                  onCheckedChange={(v) =>
                    setDraft((d) => ({ ...d, is_published: v }))
                  }
                />
                <Label htmlFor="wf-published">Published</Label>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-border pt-4">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Save
              </Button>
              {!isNew && selectedId && (
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the lesson and any owner progress
              recorded against it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
