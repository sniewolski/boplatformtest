import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@/components/ui/button";

/**
 * Shared PDF preview.
 *
 * Owns the pdf.js worker setup, the <Document>/<Page> render, page state and
 * prev/next navigation. Extracted from SopDetail so Will AI's citation viewer
 * (and any future tool that needs to preview a PDF at a specific page) can
 * reuse the same behaviour.
 *
 * `initialPage` is 1-based. When it changes (e.g. jumping between citations),
 * the viewer navigates to that page.
 */
export function PdfPreview({
  fileUrl,
  initialPage,
  className,
  maxWidth = 900,
}: {
  fileUrl: string | null;
  initialPage?: number;
  className?: string;
  maxWidth?: number;
}) {
  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }, []);

  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(Math.max(0, (initialPage ?? 1) - 1));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  // Reset on new file.
  useEffect(() => {
    setNumPages(null);
    setLoadError(null);
    setPageIndex(Math.max(0, (initialPage ?? 1) - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  // Follow initialPage prop changes on the same file (e.g. new citation click).
  useEffect(() => {
    if (initialPage == null) return;
    setPageIndex((prev) => {
      const target = Math.max(0, initialPage - 1);
      if (numPages != null) return Math.min(target, numPages - 1);
      return target;
    });
  }, [initialPage, numPages]);

  const fileProp = useMemo(() => (fileUrl ? { url: fileUrl } : null), [fileUrl]);

  return (
    <div className={className}>
      {numPages && numPages > 1 && (
        <div className="flex items-center gap-2 text-sm text-ink-muted pb-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
            aria-label="Previous page"
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
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
      <div
        className="border border-border rounded-xl overflow-hidden bg-[var(--surface-raised)] flex justify-center"
        ref={(el) => {
          if (el && el.clientWidth !== containerWidth) {
            setContainerWidth(el.clientWidth);
          }
        }}
      >
        {!fileProp && (
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
              width={containerWidth ? Math.min(containerWidth - 2, maxWidth) : 800}
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          </Document>
        )}
      </div>
    </div>
  );
}
