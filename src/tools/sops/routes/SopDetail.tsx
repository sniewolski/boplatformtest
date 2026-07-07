import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  SOPS_BUCKET,
  getSopSignedUrl,
  isDocxFileName,
  type Sop,
} from "@/lib/useSops";

export function SopDetail({ sopId }: { sopId: string }) {
  useEffect(() => {
    // pdf.js worker — pin to the same version we install (pdfjs-dist 6.x)
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }, []);

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

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  useEffect(() => {
    setPageIndex(0);
    setNumPages(null);
    setLoadError(null);
  }, [signedUrl]);

  const fileProp = useMemo(() => (signedUrl ? { url: signedUrl } : null), [signedUrl]);
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
              {!isDocx && numPages && numPages > 1 && (
                <div className="flex items-center gap-2 text-sm text-ink-muted">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pageIndex === 0}
                    onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="tabular-nums">
                    Page {pageIndex + 1} of {numPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pageIndex >= numPages - 1}
                    onClick={() => setPageIndex((i) => Math.min(numPages - 1, i + 1))}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
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
            <div
              className="border border-border rounded-xl overflow-hidden bg-[var(--surface-raised)] flex justify-center"
              ref={(el) => {
                if (el && el.clientWidth !== containerWidth) {
                  setContainerWidth(el.clientWidth);
                }
              }}
            >
              {!signedUrl && (
                <div className="py-24 text-ink-muted text-sm">Preparing preview…</div>
              )}
              {loadError && (
                <div className="py-24 text-[var(--red)] text-sm">{loadError}</div>
              )}
              {fileProp && !loadError && (
                <Document
                  file={fileProp}
                  onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                  onLoadError={(e) => setLoadError(e.message || "Failed to load PDF.")}
                  loading={
                    <div className="py-24 text-ink-muted text-sm">Loading PDF…</div>
                  }
                >
                  <Page
                    pageIndex={pageIndex}
                    width={containerWidth ? Math.min(containerWidth - 2, 900) : 800}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                </Document>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// silence unused import warning for the bucket constant re-export
void SOPS_BUCKET;
