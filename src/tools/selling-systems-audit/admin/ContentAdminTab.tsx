import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  FileType,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useIsAdmin } from "@/core/roles/useMyRoles";
import { CONTENT_CATEGORIES } from "../content/config";
import {
  createReviewNote,
  deleteReviewNote,
  generateAiDraftNote,
  getReviewAsset,
  updateReviewNote,
} from "../content/admin.functions";

/**
 * Content tab inside the per-owner audit review surface.
 *
 * Admin-only. List of submitted assets grouped by category; clicking one
 * swaps the tab body for an in-tab detail view (client state only — no
 * route change). Notes are private to admins: every save goes in as
 * status='draft', which the owner-side RLS SELECT policy excludes.
 */

type Row = {
  id: string;
  category: string;
  title: string;
  input_type: "text" | "image" | "pdf" | "md";
  body_text: string | null;
  created_at: string;
};

function inputIcon(type: Row["input_type"]) {
  switch (type) {
    case "text": return Type;
    case "image": return ImageIcon;
    case "pdf": return FileType;
    case "md": return FileText;
  }
}

export function ContentAdminTab({ ownerId }: { ownerId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return (
      <AssetDetail
        assetId={selectedId}
        onBack={() => setSelectedId(null)}
      />
    );
  }
  return <AssetList ownerId={ownerId} onOpen={setSelectedId} />;
}

function AssetList({
  ownerId,
  onOpen,
}: {
  ownerId: string;
  onOpen: (id: string) => void;
}) {
  const q = useQuery({
    queryKey: ["admin-audit", "content", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("content_review_assets")
        .select("id, category, title, input_type, body_text, created_at")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const cat of CONTENT_CATEGORIES) map.set(cat.key, []);
    for (const a of q.data ?? []) {
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    }
    return map;
  }, [q.data]);

  const total = q.data?.length ?? 0;

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <section className="flex flex-col gap-2" aria-label="Submitted content">
        <h2 className="text-lg text-ink">Submitted content</h2>
        <p className="text-ink-muted text-sm">
          Review submitted content and keep private notes.
        </p>
      </section>

      {q.isLoading && <p className="text-sm text-ink-muted">Loading…</p>}
      {q.error && (
        <p className="text-sm text-[var(--red)]">{(q.error as Error).message}</p>
      )}

      {!q.isLoading && total === 0 && (
        <div className="border border-border rounded-xl px-5 py-8 text-sm text-ink-muted">
          This owner hasn't submitted any content yet.
        </div>
      )}

      {!q.isLoading && total > 0 && (
        <div className="flex flex-col gap-8">
          {CONTENT_CATEGORIES.map((cat) => {
            const items = grouped.get(cat.key) ?? [];
            if (items.length === 0) return null;
            return (
              <section key={cat.key} className="flex flex-col gap-3">
                <h3
                  className="text-base text-ink"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {cat.label}
                </h3>
                <ul className="flex flex-col divide-y divide-border border border-border rounded-xl">
                  {items.map((a) => {
                    const Icon = inputIcon(a.input_type);
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => onOpen(a.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-raised)] transition-colors"
                        >
                          <Icon className="size-4 text-ink-muted shrink-0" />
                          <span className="text-sm text-ink truncate">
                            {a.title}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AssetDetail({
  assetId,
  onBack,
}: {
  assetId: string;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const get = useServerFn(getReviewAsset);
  const create = useServerFn(createReviewNote);
  const update = useServerFn(updateReviewNote);
  const del = useServerFn(deleteReviewNote);
  const ai = useServerFn(generateAiDraftNote);
  const isAdmin = useIsAdmin();

  const q = useQuery({
    queryKey: ["admin-content-asset", assetId],
    queryFn: () => get({ data: { assetId } }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["admin-content-asset", assetId] });
  };

  const aiMut = useMutation({
    mutationFn: () => ai({ data: { assetId } }),
    onSuccess: invalidate,
  });

  const [newNote, setNewNote] = useState("");
  const createMut = useMutation({
    mutationFn: (body: string) =>
      create({
        data: { assetId, body, source: "coach", status: "draft" },
      }),
    onSuccess: () => {
      setNewNote("");
      invalidate();
    },
  });

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors w-fit"
      >
        <ArrowLeft className="size-3.5" />
        Back to content
      </button>

      {q.isLoading && <p className="text-sm text-ink-muted">Loading…</p>}
      {q.error && (
        <p className="text-sm text-[var(--red)]">
          {(q.error as Error).message}
        </p>
      )}

      {q.data && (
        <>
          <header className="flex flex-col gap-1">
            <span className="text-xs text-ink-muted uppercase tracking-wider">
              {CONTENT_CATEGORIES.find((c) => c.key === q.data.asset.category)
                ?.label ?? q.data.asset.category}
            </span>
            <h2
              className="text-lg text-ink"
              style={{ letterSpacing: "-0.01em" }}
            >
              {q.data.asset.title}
            </h2>
          </header>

          <section className="flex flex-col gap-2" aria-label="Asset preview">
            <h3 className="text-sm font-medium text-ink">Content</h3>
            <AssetBody asset={q.data.asset} signedUrl={q.data.signedUrl} />
          </section>

          <section className="flex flex-col gap-3" aria-label="Private notes">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-ink">
                Notes {q.data.notes.length > 0 && `(${q.data.notes.length})`}
              </h3>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => aiMut.mutate()}
                  disabled={aiMut.isPending}
                >
                  <Sparkles className="size-4 mr-2" />
                  {aiMut.isPending ? "Drafting…" : "AI draft"}
                </Button>
              )}
            </div>
            {isAdmin && aiMut.error && (
              <p className="text-sm text-[var(--red)]">
                {(aiMut.error as Error).message}
              </p>
            )}

            <ul className="flex flex-col gap-3">
              {q.data.notes.length === 0 && (
                <li className="text-ink-muted text-sm">No notes yet.</li>
              )}
              {q.data.notes.map((n) => (
                <NoteRow
                  key={n.id}
                  note={n}
                  readOnly={!isAdmin}
                  onSave={async (body) => {
                    await update({ data: { noteId: n.id, body } });
                    invalidate();
                  }}
                  onDelete={async () => {
                    await del({ data: { noteId: n.id } });
                    invalidate();
                  }}
                />
              ))}
            </ul>

            {isAdmin && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <label className="text-xs text-ink-muted">New note</label>
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Short, tight, concrete. Point to the problem and the fix."
                  className="min-h-[120px]"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!newNote.trim() || createMut.isPending}
                    onClick={() => createMut.mutate(newNote.trim())}
                  >
                    Save
                  </Button>
                </div>
                {createMut.error && (
                  <p className="text-sm text-[var(--red)]">
                    {(createMut.error as Error).message}
                  </p>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function NoteRow({
  note,
  onSave,
  onDelete,
  readOnly = false,
}: {
  note: { id: string; body: string; source: string };
  onSave: (body: string) => Promise<void>;
  onDelete: () => Promise<void>;
  readOnly?: boolean;
}) {
  const [body, setBody] = useState(note.body);
  const [busy, setBusy] = useState(false);

  useEffect(() => setBody(note.body), [note.body]);

  const dirty = body.trim() !== note.body.trim();
  const isAi = note.source === "ai_suggestion";

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border border-border rounded-xl p-4 flex flex-col gap-2 bg-[var(--surface-raised)]">
      <div className="flex items-center justify-between text-xs text-ink-muted">
        <span>{isAi ? "AI draft" : "Coach"}</span>
        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => run(onDelete)}
            className="text-ink-muted hover:text-[var(--red)] h-7 px-2"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="min-h-[100px] bg-background"
        readOnly={readOnly}
        disabled={readOnly}
      />
      {!readOnly && dirty && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => run(() => onSave(body.trim()))}
          >
            Save
          </Button>
        </div>
      )}
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
      <pre className="whitespace-pre-wrap break-words text-sm font-mono text-ink bg-[var(--surface-raised)] border border-border rounded-xl p-4 max-h-[60vh] overflow-y-auto">
        {asset.body_text}
      </pre>
    );
  }
  if (asset.input_type === "image" && signedUrl) {
    return (
      <div className="border border-border rounded-xl overflow-hidden bg-[var(--surface-raised)]">
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
        className="inline-flex items-center gap-1.5 text-sm text-ink hover:text-[var(--red)] border border-border rounded-xl p-4 bg-[var(--surface-raised)]"
      >
        Open {asset.storage_path?.split("/").pop()}{" "}
        <ExternalLink className="size-3.5" />
      </a>
    );
  }
  return <p className="text-ink-muted text-sm">No content.</p>;
}
