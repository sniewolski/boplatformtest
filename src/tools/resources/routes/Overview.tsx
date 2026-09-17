import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, FileText, Search } from "lucide-react";
import {
  downloadResource,
  useResources,
  type Resource,
} from "@/lib/useResources";

const OTHER = "Other";

function groupByCategory(rows: Resource[]): { name: string; items: Resource[] }[] {
  const map = new Map<string, { name: string; items: Resource[] }>();
  for (const r of rows) {
    const raw = (r.category ?? "").trim();
    const name = raw || OTHER;
    const key = name.toLowerCase();
    const bucket = map.get(key) ?? { name, items: [] };
    bucket.items.push(r);
    map.set(key, bucket);
  }
  const groups = [...map.values()];
  groups.sort((a, b) => {
    if (a.name === OTHER) return 1;
    if (b.name === OTHER) return -1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  for (const g of groups) {
    g.items.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    );
  }
  return groups;
}

export function ResourcesOverview() {
  const resources = useResources();
  const [q, setQ] = useState("");

  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    const rows = resources.data ?? [];
    if (!query) return rows;
    return rows.filter((r) =>
      `${r.title} ${r.description ?? ""} ${r.file_name} ${r.category ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [resources.data, query]);

  const groups = useMemo(() => groupByCategory(filtered), [filtered]);

  return (
    <div className="app-content py-16 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Resources</h1>
        <p className="text-ink-muted text-sm">
          Worksheets, templates and one-pagers. Preview in-app or download.
        </p>
      </header>

      <label className="relative flex items-center">
        <Search className="absolute left-3 size-4 text-ink-muted" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search resources…"
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {resources.isLoading && <p className="text-ink-muted text-sm">Loading…</p>}

      {!resources.isLoading && groups.length === 0 && (
        <p className="text-ink-muted text-sm">
          {query ? "No resources match your search." : "No resources available yet."}
        </p>
      )}

      <div className="flex flex-col gap-10">
        {groups.map((g) => (
          <section key={g.name} className="flex flex-col gap-3">
            <h2 className="text-xl font-medium text-ink" style={{ letterSpacing: "-0.01em" }}>
              {g.name}
              <span className="text-ink-muted text-sm font-normal ml-2">
                ({g.items.length})
              </span>
            </h2>
            <ul className="flex flex-col divide-y divide-border border border-border rounded-xl list-none">
              {g.items.map((r) => (
                <ResourceRow key={r.id} resource={r} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function ResourceRow({ resource }: { resource: Resource }) {
  const [busy, setBusy] = useState(false);
  return (
    <li className="flex items-center gap-3">
      <Link
        to="/app/tools/$key/$"
        params={{ key: "resources", _splat: resource.id }}
        className="flex-1 min-w-0 flex items-start gap-3 px-5 py-4 hover:bg-[var(--surface-raised)] transition-colors motion-safe:active:scale-[0.97] motion-safe:transition-transform"
      >
        <FileText className="size-4 text-ink-muted mt-0.5 shrink-0" aria-hidden />
        <div className="flex flex-col min-w-0">
          <span className="text-ink text-sm truncate">{resource.title}</span>
          {resource.description && (
            <span className="text-ink-muted text-xs line-clamp-2">
              {resource.description}
            </span>
          )}
        </div>
      </Link>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await downloadResource(resource);
          } finally {
            setBusy(false);
          }
        }}
        aria-label={`Download ${resource.title}`}
        className="mr-4 shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-ink-muted hover:text-ink hover:bg-[var(--surface-raised)] transition-colors motion-safe:active:scale-[0.97] motion-safe:transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        <Download className="size-4" aria-hidden />
        <span className="hidden sm:inline">Download</span>
      </button>
    </li>
  );
}
