import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Plus, FileText, Image as ImageIcon, FileType, Type } from "lucide-react";
import { useSession } from "@/core/auth/useSession";
import { Button } from "@/components/ui/button";
import { CONTENT_CATEGORIES } from "../content/config";
import { useContentAssets, type ContentAsset } from "../content/useContentReview";
import { UploadDialog } from "../content/UploadDialog";
import { AssetDrawer } from "../content/AssetDrawer";

function inputIcon(type: ContentAsset["input_type"]) {
  switch (type) {
    case "text": return Type;
    case "image": return ImageIcon;
    case "pdf": return FileType;
    case "md": return FileText;
  }
}

export function ContentReview() {
  const { session } = useSession();
  const ownerId = session?.user.id;
  const { data: assets, isLoading } = useContentAssets(ownerId);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string | undefined>(undefined);
  const [openAsset, setOpenAsset] = useState<ContentAsset | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, ContentAsset[]>();
    for (const cat of CONTENT_CATEGORIES) map.set(cat.key, []);
    for (const a of assets ?? []) {
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    }
    return map;
  }, [assets]);


  function openUpload(category?: string) {
    setUploadCategory(category);
    setUploadOpen(true);
  }

  return (
    <div className="app-content py-12 flex flex-col gap-10">
      <Link
        to="/app/tools/$key/$"
        params={{ key: "selling-systems-audit", _splat: "" }}
        className="inline-flex items-center gap-2 text-ink-muted text-sm hover:text-ink transition-colors w-fit"
      >
        <ArrowLeft className="size-4" />
        Back to audit
      </Link>

      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl" style={{ letterSpacing: "-0.02em" }}>
            Sales Content Review
          </h1>
          <p className="text-ink-muted text-base max-w-prose">
            Upload the messages, scripts and cadences your sales motion runs on,
            organized by type. We'll go through them together on your call.
          </p>
        </div>
        <Button onClick={() => openUpload()} className="active:scale-[0.97] transition-transform">
          <Plus className="size-4 mr-1.5" />
          Add content
        </Button>
      </header>


      {isLoading ? (
        <p className="text-ink-muted text-sm">Loading…</p>
      ) : (
        <div className="flex flex-col gap-10">
          {CONTENT_CATEGORIES.map((cat) => {
            const items = grouped.get(cat.key) ?? [];
            return (
              <section key={cat.key} className="flex flex-col gap-4">
                <div className="flex items-baseline justify-between gap-4 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-medium" style={{ letterSpacing: "-0.01em" }}>
                      {cat.label}
                    </h2>
                    <p className="text-ink-muted text-sm">{cat.tip}</p>
                  </div>
                  <button
                    onClick={() => openUpload(cat.key)}
                    className="text-sm text-ink-muted hover:text-ink transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="size-3.5" /> Add
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="border border-dashed border-border rounded-xl px-5 py-6 text-sm text-ink-muted">
                    Nothing here yet.
                  </div>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((a) => {
                      const Icon = inputIcon(a.input_type);
                      return (
                        <li key={a.id}>
                          <button
                            onClick={() => setOpenAsset(a)}
                            className="w-full text-left border border-border rounded-xl p-4 flex flex-col gap-3 hover:bg-[var(--surface-raised)] transition-colors min-h-[120px]"
                          >
                            <div className="flex items-center gap-2 text-ink-muted text-xs">
                              <Icon className="size-3.5" />
                              <span className="uppercase tracking-wider">{a.input_type}</span>
                            </div>
                            <p className="text-ink text-sm font-medium line-clamp-2">{a.title}</p>
                            {a.body_text && (
                              <p className="text-ink-muted text-xs line-clamp-2 font-mono">
                                {a.body_text}
                              </p>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {ownerId && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          ownerId={ownerId}
          defaultCategory={uploadCategory}
        />
      )}
      {ownerId && (
        <AssetDrawer
          asset={openAsset}
          open={!!openAsset}
          onOpenChange={(v) => { if (!v) setOpenAsset(null); }}
          ownerId={ownerId}
        />
      )}
    </div>
  );
}
