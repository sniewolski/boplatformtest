import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Trash2, ExternalLink, FileText, Image as ImageIcon, FileType } from "lucide-react";
import { useAssetNotes, useDeleteAsset, getSignedAssetUrl, type ContentAsset } from "./useContentReview";
import { CONTENT_CATEGORIES } from "./config";

function categoryLabel(key: string) {
  return CONTENT_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

function relativeTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

export function AssetDrawer({
  asset,
  open,
  onOpenChange,
  ownerId,
}: {
  asset: ContentAsset | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  ownerId: string;
}) {
  const { data: notes } = useAssetNotes(asset?.id ?? null);
  const del = useDeleteAsset(ownerId);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    setSignedUrl(null);
    if (asset?.storage_path) {
      void getSignedAssetUrl(asset.storage_path).then(setSignedUrl);
    }
  }, [asset?.id, asset?.storage_path]);

  if (!asset) return null;

  const published = (notes ?? []).filter((n) => n.status === "published");

  async function handleDelete() {
    if (!asset) return;
    if (!confirm("Delete this piece of content and its feedback? This cannot be undone.")) return;
    try {
      await del.mutateAsync(asset);
      onOpenChange(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not delete.");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-6 overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 text-ink-muted text-xs uppercase tracking-wider">
            <span>{categoryLabel(asset.category)}</span>
            <span>·</span>
            <span>{relativeTime(asset.created_at)}</span>
            <span>·</span>
            <span className={asset.review_status === "reviewed" ? "text-ink" : ""}>
              {asset.review_status === "reviewed" ? "Reviewed" : "Awaiting review"}
            </span>
          </div>
          <SheetTitle className="text-xl" style={{ letterSpacing: "-0.01em" }}>
            {asset.title}
          </SheetTitle>
          <SheetDescription className="text-ink-muted text-sm">
            Your content, plus any feedback your coach has published.
          </SheetDescription>
        </SheetHeader>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-ink">Content</h3>
          {asset.input_type === "text" && asset.body_text ? (
            <pre className="whitespace-pre-wrap break-words text-sm font-mono text-ink bg-[var(--surface-raised)] border border-border rounded-lg p-4 max-h-[40vh] overflow-y-auto">
              {asset.body_text}
            </pre>
          ) : asset.storage_path ? (
            <AssetFilePreview asset={asset} signedUrl={signedUrl} />
          ) : null}
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-ink">
            Coach feedback {published.length > 0 ? `(${published.length})` : ""}
          </h3>
          {published.length === 0 ? (
            <p className="text-ink-muted text-sm">
              No feedback yet. Your coach will review this and publish notes here.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {published.map((n) => (
                <li key={n.id} className="border border-border rounded-lg p-4 flex flex-col gap-2">
                  <div className="text-ink-muted text-xs">{relativeTime(n.created_at)}</div>
                  <p className="whitespace-pre-wrap text-sm text-ink leading-relaxed">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-auto pt-4 border-t border-border flex justify-end">
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={del.isPending}
            className="text-ink-muted hover:text-[var(--red)]"
          >
            <Trash2 className="size-4 mr-2" />
            {del.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AssetFilePreview({ asset, signedUrl }: { asset: ContentAsset; signedUrl: string | null }) {
  const Icon =
    asset.input_type === "image" ? ImageIcon :
    asset.input_type === "pdf" ? FileType : FileText;

  if (asset.input_type === "image" && signedUrl) {
    return (
      <div className="border border-border rounded-lg overflow-hidden bg-[var(--surface-raised)]">
        <img src={signedUrl} alt={asset.title} className="max-w-full max-h-[50vh] object-contain mx-auto" />
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-4 flex items-center gap-3 bg-[var(--surface-raised)]">
      <Icon className="size-5 text-ink-muted shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate">
          {asset.storage_path?.split("/").pop() ?? "File"}
        </p>
        <p className="text-xs text-ink-muted uppercase">{asset.input_type}</p>
      </div>
      {signedUrl && (
        <a
          href={signedUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-sm text-ink hover:text-[var(--red)] transition-colors"
        >
          Open <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
  );
}
