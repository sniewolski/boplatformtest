/**
 * Proof-of-concept endpoint: verify mupdf's WASM can load inside the
 * deployed Cloudflare Worker via a manual `instantiateWasm` hook,
 * then extract text from a known-uploaded PDF and return it.
 *
 * Bearer-auth matches the real ingestion hook. Not wired to the queue.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "will-ai-content";
const SOURCE_ID = "965212af-04e7-4016-b348-1c769dd8e665";
const STORAGE_PATH = `${SOURCE_ID}/source.pdf`;

export const Route = createFileRoute("/api/public/hooks/mupdf-test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const started = Date.now();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceKey) {
          return Response.json({ error: "Server misconfigured" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length).trim();
        if (token !== supabaseServiceKey) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        const steps: Array<{ step: string; ms: number; ok: boolean; detail?: string }> = [];
        const mark = (step: string, ok: boolean, since: number, detail?: string) =>
          steps.push({ step, ok, ms: Date.now() - since, detail });

        try {
          // 1. Fetch the wasm binary served from /public/wasm/ as a static asset.
          const t0 = Date.now();
          const origin = new URL(request.url).origin;
          const wasmRes = await fetch(`${origin}/wasm/mupdf-wasm.wasm`);
          if (!wasmRes.ok) {
            mark("fetch_wasm", false, t0, `HTTP ${wasmRes.status}`);
            return Response.json({ ok: false, steps }, { status: 500 });
          }
          const wasmBytes = new Uint8Array(await wasmRes.arrayBuffer());
          mark("fetch_wasm", true, t0, `${wasmBytes.byteLength} bytes`);

          // 2. Compile the wasm module once.
          const t1 = Date.now();
          const wasmModule = await WebAssembly.compile(wasmBytes);
          mark("compile_wasm", true, t1);

          // 3. Install the Emscripten Module override BEFORE importing mupdf.
          //    - `instantiateWasm(imports, receiver)` bypasses mupdf-wasm.js's
          //      fs / path / import.meta.url resolution branch entirely.
          //    - `locateFile` is set defensively; it should never be consulted.
          (globalThis as any).$libmupdf_wasm_Module = {
            locateFile: (p: string) => p,
            instantiateWasm: (
              imports: WebAssembly.Imports,
              receiver: (instance: WebAssembly.Instance) => void,
            ) => {
              WebAssembly.instantiate(wasmModule, imports).then((instance) => {
                receiver(instance);
              });
              return {}; // per Emscripten docs; async completion via `receiver`
            },
          };

          // 4. Dynamically import mupdf. Top-level `await libmupdf_wasm(...)`
          //    inside mupdf.js now runs against our override.
          const t2 = Date.now();
          const mupdf: any = await import("mupdf");
          mark("import_mupdf", true, t2);

          // 5. Pull the PDF from storage.
          const t3 = Date.now();
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          const { data: file, error: dlErr } = await supabase.storage
            .from(BUCKET)
            .download(STORAGE_PATH);
          if (dlErr || !file) {
            mark("download_pdf", false, t3, dlErr?.message ?? "no data");
            return Response.json({ ok: false, steps }, { status: 500 });
          }
          const pdfBytes = new Uint8Array(await file.arrayBuffer());
          mark("download_pdf", true, t3, `${pdfBytes.byteLength} bytes`);

          // 6. Open the doc + extract text from page 1.
          const t4 = Date.now();
          const doc = mupdf.Document.openDocument(pdfBytes, "application/pdf");
          const totalPages = doc.countPages();
          const page = doc.loadPage(0);
          const structured = page.toStructuredText("preserve-whitespace");
          const text: string = structured.asText();
          mark("extract_text", true, t4, `${text.length} chars`);

          return Response.json({
            ok: true,
            totalMs: Date.now() - started,
            totalPages,
            textPreview: text.slice(0, 500),
            textLength: text.length,
            steps,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const stack = err instanceof Error ? err.stack?.slice(0, 800) : undefined;
          steps.push({ step: "exception", ok: false, ms: Date.now() - started, detail: message });
          return Response.json({ ok: false, error: message, stack, steps }, { status: 500 });
        }
      },
    },
  },
});
