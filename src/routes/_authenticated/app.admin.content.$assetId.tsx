import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createReviewNote,
  deleteReviewNote,
  generateAiDraftNote,
  getReviewAsset,
  updateReviewNote,
} from "@/tools/selling-systems-audit/content/admin.functions";
import { CONTENT_CATEGORIES } from "@/tools/selling-systems-audit/content/config";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Trash2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/content/$assetId")({
  component: AdminAssetReview,
});

function categoryLabel(key: string) {
  return CONTENT_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

function AdminAssetReview() {
  const { assetId } = Route.useParams();
  const qc = useQueryClient();
  const get = useServerFn(getReviewAsset);
  const create = useServerFn(createReviewNote);
  const update = useServerFn(updateReviewNote);
  const del = useServerFn(deleteReviewNote);
  const ai = useServerFn(generateAiDraftNote);

  const q = useQuery({
    queryKey: ["admin-content-asset", assetId],
    queryFn: () => get({ data: { assetId } }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-content-asset", assetId] });
    void qc.invalidateQueries({ queryKey: ["admin-content-assets"] });
  };

  const aiMut = useMutation({
    mutationFn: () => ai({ data: { assetId } }),
    onSuccess: invalidate,
  });

  const [newNote, setNewNote] = useState("");
  const createMut = useMutation({
    mutationFn: (vars: { body: string; status: "draft" | "published" }) =>
      create({ data: { assetId, ...vars, source: "coach" } }),
    onSuccess: () => {
      setNewNote("");
      invalidate();
    },
  });

  if (q.isLoading) {
    return <p className="app-content py-16 text-ink-muted text-sm">Loading…</p>;
  }
  if (q.error || !q.data) {
    return (
      <div className="app-content py-16">
        <p className="text-sm text-[var(--red)]">
          {(q.error as Error)?.message ?? "Not found"}
        </p>
        <Link to="/app/admin/content" className="text-ink-muted text-sm">
          ← Back
        </Link>
      </div>
    );
  }

  const { asset, notes, owner_email, signedUrl } = q.data;

  return (
    <div className="app-content py-16 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link to="/app/admin/content" className="text-ink-muted text-xs hover:text-ink">
          ← Sales Content Review
        </Link>
        <div className="flex items-center gap-2 text-ink-muted text-xs uppercase tracking-wider">
          <span>{categoryLabel(asset.category)}</span>
          <span>·</span>
          <span>{owner_email}</span>
          <span>·</span>
          <span>{relativeTime(asset.created_at)}</span>
          <span>·</span>
          <span className={asset.review_status === "reviewed" ? "" : "text-ink"}>
            {asset.review_status === "reviewed" ? "Reviewed" : "Pending"}
          </span>
        </div>
        <h1 className="text-2xl" style={{ letterSpacing: "-0.01em" }}>
          {asset.title}
        </h1>
      </header>

      <div className="grid gap-8" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
        <section className="flex flex-col gap-3 min-w-0">
          <h2 className="text-sm font-medium text-ink">Content</h2>
          <AssetBody asset={asset} signedUrl={signedUrl} />
        </section>

        <section className="flex flex-col gap-4 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-ink">
              Notes {notes.length > 0 && `(${notes.length})`}
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => aiMut.mutate()}
              disabled={aiMut.isPending}
            >
              <Sparkles className="size-4 mr-2" />
              {aiMut.isPending ? "Drafting…" : "AI draft"}
            </Button>
          </div>
          {aiMut.error && (
            <p className="text-sm text-[var(--red)]">
              {(aiMut.error as Error).message}
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {notes.length === 0 && (
              <li className="text-ink-muted text-sm">No notes yet.</li>
            )}
            {notes.map((n) => (
              <NoteRow
                key={n.id}
                note={n}
                onUpdate={async (patch) => {
                  await update({ data: { noteId: n.id, ...patch } });
                  invalidate();
                }}
                onDelete={async () => {
                  await del({ data: { noteId: n.id } });
                  invalidate();
                }}
              />
            ))}
          </ul>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <label className="text-xs text-ink-muted">New coach note</label>
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Short, tight, concrete. Point to the problem and the fix."
              className="min-h-[120px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!newNote.trim() || createMut.isPending}
                onClick={() => createMut.mutate({ body: newNote.trim(), status: "draft" })}
              >
                Save draft
              </Button>
              <Button
                size="sm"
                disabled={!newNote.trim() || createMut.isPending}
                onClick={() => createMut.mutate({ body: newNote.trim(), status: "published" })}
              >
                Publish
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function NoteRow({
  note,
  onUpdate,
  onDelete,
}: {
  note: {
    id: string;
    body: string;
    source: string;
    status: string;
    created_at: string;
  };
  onUpdate: (patch: { body?: string; status?: "draft" | "published" }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [body, setBody] = useState(note.body);
  const [busy, setBusy] = useState(false);

  useEffect(() => setBody(note.body), [note.body]);

  const dirty = body.trim() !== note.body.trim();
  const isAi = note.source === "ai_suggestion";
  const isDraft = note.status === "draft";

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border border-border rounded-lg p-4 flex flex-col gap-2 bg-[var(--surface-raised)]">
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <div className="flex items-center gap-2">
          <span className={isDraft ? "text-ink" : ""}>
            {isDraft ? "Draft" : "Published"}
          </span>
          <span>·</span>
          <span>{isAi ? "AI draft" : "Coach"}</span>
          <span>·</span>
          <span>{relativeTime(note.created_at)}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => run(onDelete)}
          className="text-ink-muted hover:text-[var(--red)] h-7 px-2"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="min-h-[100px] bg-background"
      />
      <div className="flex justify-end gap-2">
        {dirty && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => run(() => onUpdate({ body: body.trim() }))}
          >
            Save
          </Button>
        )}
        {isDraft ? (
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              run(async () => {
                if (dirty) await onUpdate({ body: body.trim(), status: "published" });
                else await onUpdate({ status: "published" });
              })
            }
          >
            Publish
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => run(() => onUpdate({ status: "draft" }))}
          >
            Unpublish
          </Button>
        )}
      </div>
    </li>
  );
}

function AssetBody({
  asset,
  signedUrl,
}: {
  asset: {
    input_type: string;
    body_text: string | null;
    storage_path: string | null;
    title: string;
  };
  signedUrl: string | null;
}) {
  if (asset.input_type === "text" && asset.body_text) {
    return (
      <pre className="whitespace-pre-wrap break-words text-sm font-mono text-ink bg-[var(--surface-raised)] border border-border rounded-lg p-4 max-h-[60vh] overflow-y-auto">
        {asset.body_text}
      </pre>
    );
  }
  if (asset.input_type === "image" && signedUrl) {
    return (
      <div className="border border-border rounded-lg overflow-hidden bg-[var(--surface-raised)]">
        <img
          src={signedUrl}
          alt={asset.title}
          className="max-w-full max-h-[60vh] object-contain mx-auto"
        />
      </div>
    );
  }
  if (signedUrl) {
    return (
      <a
        href={signedUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1.5 text-sm text-ink hover:text-[var(--red)] border border-border rounded-lg p-4 bg-[var(--surface-raised)]"
      >
        Open {asset.storage_path?.split("/").pop()} <ExternalLink className="size-3.5" />
      </a>
    );
  }
  return <p className="text-ink-muted text-sm">No content.</p>;
}
