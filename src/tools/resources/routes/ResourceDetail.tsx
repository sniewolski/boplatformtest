import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PdfPreview } from "@/components/PdfPreview";
import {
  downloadResource,
  getResourceSignedUrl,
  isDocxFileName,
  type Resource,
} from "@/lib/useResources";

export function ResourceDetail({ resourceId }: { resourceId: string }) {
  const meta = useQuery({
    queryKey: ["resource", resourceId],
    queryFn: async (): Promise<Resource | null> => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("id", resourceId)
        .maybeSingle();
      if (error) throw error;
      return (data as Resource | null) ?? null;
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
      const url = await getResourceSignedUrl(meta.data!.file_path, 600);
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
          params={{ key: "resources", _splat: "" }}
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="size-4" />
          All resources
        </Link>
      </div>

      {meta.isLoading && <p className="text-ink-muted text-sm">Loading…</p>}
      {meta.error && (
        <p className="text-[var(--red)] text-sm">{(meta.error as Error).message}</p>
      )}
      {meta.data === null && !meta.isLoading && (
        <p className="text-ink-muted text-sm">Resource not found.</p>
      )}

      {meta.data && (
        <>
          <header className="flex flex-col gap-2">
            {meta.data.category && (
              <p className="text-ink-muted text-sm">{meta.data.category}</p>
            )}
            <h1 className="text-2xl">{meta.data.title}</h1>
            {meta.data.description && (
              <p className="text-ink-muted text-sm">{meta.data.description}</p>
            )}
            <div className="flex items-center gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="motion-safe:active:scale-[0.97] motion-safe:transition-transform"
                onClick={() => downloadResource(meta.data!)}
              >
                <Download className="size-4" />
                Download
              </Button>
            </div>
          </header>

          {isDocx ? (
            <div className="border border-border rounded-xl bg-[var(--surface-raised)] px-6 py-10 flex items-center gap-4">
              <FileText className="size-8 text-ink-muted shrink-0" aria-hidden />
              <div className="flex flex-col min-w-0">
                <span className="text-ink text-sm truncate">{meta.data.file_name}</span>
                <span className="text-ink-muted text-xs">
                  Word document — in-app preview isn't available. Use “Download”.
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
