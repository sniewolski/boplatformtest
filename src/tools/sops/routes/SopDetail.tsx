import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PdfPreview } from "@/components/PdfPreview";
import {
  SOPS_BUCKET,
  getSopSignedUrl,
  isDocxFileName,
  type Sop,
} from "@/lib/useSops";

export function SopDetail({ sopId }: { sopId: string }) {
  const meta = useQuery({
    queryKey: ["sop", sopId],
    queryFn: async (): Promise<Sop | null> => {
      const { data, error } = await supabase
        .from("sops")
        .select("*")
        .eq("id", sopId)
        .maybeSingle();
      if (error) throw error;
      return (data as Sop | null) ?? null;
    },
  });

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!meta.data?.file_path) {
      setSignedUrl(null);
      return;
    }
    (async () => {
      const url = await getSopSignedUrl(meta.data!.file_path, 600);
      if (!cancelled) setSignedUrl(url);
    })();
    return () => {
      cancelled = true;
    };
  }, [meta.data?.file_path]);

  const isDocx = meta.data ? isDocxFileName(meta.data.file_name) : false;

  return (
    <div className="app-content py-16 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link
          to="/app/tools/$key/$"
          params={{ key: "sops", _splat: "" }}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="size-4" />
          All SOPs
        </Link>
      </div>

      {meta.isLoading && <p className="text-ink-muted text-sm">Loading…</p>}
      {meta.error && (
        <p className="text-[var(--red)] text-sm">
          {(meta.error as Error).message}
        </p>
      )}
      {meta.data === null && !meta.isLoading && (
        <p className="text-ink-muted text-sm">SOP not found.</p>
      )}

      {meta.data && (
        <>
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl">{meta.data.title}</h1>
            {meta.data.description && (
              <p className="text-ink-muted text-sm">{meta.data.description}</p>
            )}
            <div className="flex items-center gap-3 pt-1">
              <a
                href={signedUrl ?? "#"}
                download={meta.data.file_name}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!signedUrl}
                onClick={(e) => {
                  if (!signedUrl) e.preventDefault();
                }}
              >
                <Button variant="outline" size="sm" disabled={!signedUrl}>
                  <Download className="size-4" />
                  {isDocx ? "Download to view" : "Download PDF"}
                </Button>
              </a>
            </div>
          </header>

          {isDocx ? (
            <div className="border border-border rounded-xl bg-[var(--surface-raised)] px-6 py-10 flex items-center gap-4">
              <FileText className="size-8 text-ink-muted shrink-0" aria-hidden />
              <div className="flex flex-col min-w-0">
                <span className="text-ink text-sm truncate">
                  {meta.data.file_name}
                </span>
                <span className="text-ink-muted text-xs">
                  Word document — in-app preview isn't available. Use
                  “Download to view”.
                </span>
              </div>
            </div>
          ) : (
            <PdfPreview fileUrl={signedUrl} />
          )}
        </>
      )}
    </div>
  );
}

// silence unused import warning for the bucket constant re-export
void SOPS_BUCKET;
