// Path C proof-of-concept: run mupdf inside a Supabase Edge Function (Deno).
// Downloads a known-uploaded PDF, extracts page 1 text, rasterizes page 1 to PNG,
// uploads the PNG back to storage, and returns signed URLs + timings.
//
// No auth: throwaway route. Hardcoded source id matches earlier proofs.
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "will-ai-content";
const SOURCE_ID = "965212af-04e7-4016-b348-1c769dd8e665";
const STORAGE_PATH = `${SOURCE_ID}/source.pdf`;
const OUT_PATH = `${SOURCE_ID}/proof/mupdf-poc-page-1.png`;

Deno.serve(async () => {
  const started = Date.now();
  const steps: Array<{ step: string; ms: number; ok: boolean; detail?: string }> = [];
  const mark = (step: string, ok: boolean, since: number, detail?: string) =>
    steps.push({ step, ok, ms: Date.now() - since, detail });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Import mupdf (npm: specifier — Deno resolves the wasm asset itself).
    const t0 = Date.now();
    const mupdf: any = await import("npm:mupdf@1.28.0");
    mark("import_mupdf", true, t0);

    // 2. Download the PDF.
    const t1 = Date.now();
    const { data: file, error: dlErr } = await supabase.storage
      .from(BUCKET)
      .download(STORAGE_PATH);
    if (dlErr || !file) {
      mark("download_pdf", false, t1, dlErr?.message ?? "no data");
      return Response.json({ ok: false, steps }, { status: 500 });
    }
    const pdfBytes = new Uint8Array(await file.arrayBuffer());
    mark("download_pdf", true, t1, `${pdfBytes.byteLength} bytes`);

    // 3. Open + count pages.
    const t2 = Date.now();
    const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
    const totalPages: number = doc.countPages();
    mark("open_doc", true, t2, `${totalPages} pages`);

    // 4. Extract text.
    const t3 = Date.now();
    const page = doc.loadPage(0);
    const structured = page.toStructuredText("preserve-whitespace");
    const text: string = structured.asText();
    mark("extract_text", true, t3, `${text.length} chars`);

    // 5. Rasterize page 1 to PNG.
    const t4 = Date.now();
    const rasterMatrix = mupdf.Matrix.scale(2, 2);
    const pix = page.toPixmap(rasterMatrix, mupdf.ColorSpace.DeviceRGB, false, true);
    const pngBytes: Uint8Array = pix.asPNG();
    pix.destroy();
    mark("rasterize_png", true, t4, `${pngBytes.byteLength} bytes`);

    // 6. Upload PNG.
    const t5 = Date.now();
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(OUT_PATH, pngBytes, { contentType: "image/png", upsert: true });
    if (upErr) {
      mark("upload_png", false, t5, upErr.message);
      return Response.json({ ok: false, steps }, { status: 500 });
    }
    mark("upload_png", true, t5);

    // 7. Signed URL for review.
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(OUT_PATH, 600);

    return Response.json({
      ok: true,
      totalMs: Date.now() - started,
      totalPages,
      textLength: text.length,
      textPreview: text.slice(0, 500),
      pngBytes: pngBytes.byteLength,
      pngSignedUrl: signed?.signedUrl ?? null,
      steps,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.slice(0, 1200) : undefined;
    steps.push({ step: "exception", ok: false, ms: Date.now() - started, detail: message });
    return Response.json({ ok: false, error: message, stack, steps }, { status: 500 });
  }
});
