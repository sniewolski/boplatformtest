import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, Image as ImageIcon, FileType, Type, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CONTENT_CATEGORIES } from "../content/config";

/**
 * Content tab inside the per-owner audit review surface.
 *
 * Read-only list of one owner's submitted content assets, grouped by category
 * (same grouping the owner sees). Each row links to the existing deep-dive
 * admin review page at /app/admin/content/$assetId where the coach can read
 * the asset, see/draft notes, and mark reviewed.
 *
 * Admin access is granted by the content_review_assets RLS policy
 * (has_role(auth.uid(), 'admin')), so we read directly through the browser
 * client — no new server function needed.
 */

type Row = {
  id: string;
  category: string;
  title: string;
  input_type: "text" | "image" | "pdf" | "md";
  review_status: "pending" | "reviewed";
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
  const q = useQuery({
    queryKey: ["admin-audit", "content", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("content_review_assets")
        .select(
          "id, category, title, input_type, review_status, body_text, created_at",
        )
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
  const reviewed = (q.data ?? []).filter((a) => a.review_status === "reviewed").length;

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <section className="flex flex-col gap-2" aria-label="Content review overview">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg text-ink">Submitted content</h2>
          {!q.isLoading && total > 0 && (
            <span className="text-xs text-ink-muted tabular-nums">
              {reviewed} / {total} reviewed
            </span>
          )}
        </div>
        <p className="text-ink-muted text-sm">
          Open any item to review it, draft AI feedback, and publish notes back
          to the owner.
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
                <div className="flex items-baseline justify-between gap-3">
                  <h3
                    className="text-base text-ink"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {cat.label}
                  </h3>
                  <span className="text-xs text-ink-muted tabular-nums">
                    {items.length}
                  </span>
                </div>
                <ul className="flex flex-col divide-y divide-border border border-border rounded-xl">
                  {items.map((a) => {
                    const Icon = inputIcon(a.input_type);
                    return (
                      <li key={a.id}>
                        <Link
                          to="/app/admin/content/$assetId"
                          params={{ assetId: a.id }}
                          className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-[var(--surface-raised)] transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className="size-4 text-ink-muted shrink-0" />
                            <div className="flex flex-col min-w-0 gap-0.5">
                              <span className="text-sm text-ink truncate">
                                {a.title}
                              </span>
                              {a.body_text && (
                                <span className="text-xs text-ink-muted truncate font-mono">
                                  {a.body_text}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={
                                "text-xs uppercase tracking-wider " +
                                (a.review_status === "reviewed"
                                  ? "text-ink-muted"
                                  : "text-ink")
                              }
                            >
                              {a.review_status === "reviewed"
                                ? "Reviewed"
                                : "Pending"}
                            </span>
                            <ArrowUpRight className="size-3.5 text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Link>
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
