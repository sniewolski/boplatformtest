import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileText, Folder, Search } from "lucide-react";
import { useSopFolders, useSops, type Sop, type SopFolder } from "@/lib/useSops";

export function SopsOverview() {
  const folders = useSopFolders();
  const sops = useSops();
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    const map = new Map<string | null, Sop[]>();
    for (const s of sops.data ?? []) {
      const arr = map.get(s.folder_id) ?? [];
      arr.push(s);
      map.set(s.folder_id, arr);
    }
    return map;
  }, [sops.data]);

  const query = q.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!query) return null;
    return (sops.data ?? []).filter((s) => {
      const hay = `${s.title} ${s.description ?? ""} ${s.file_name}`.toLowerCase();
      return hay.includes(query);
    });
  }, [sops.data, query]);

  const folderById = new Map((folders.data ?? []).map((f) => [f.id, f]));
  const uncategorized = grouped.get(null) ?? [];

  return (
    <div className="app-content py-16 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">SOPs</h1>
        <p className="text-ink-muted text-sm">
          Standard operating procedures. Browse by folder or search.
        </p>
      </header>

      <label className="relative flex items-center">
        <Search className="absolute left-3 size-4 text-ink-muted" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search SOPs…"
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {(folders.isLoading || sops.isLoading) && (
        <p className="text-ink-muted text-sm">Loading…</p>
      )}

      {matches ? (
        <SearchResults
          results={matches}
          folderById={folderById}
        />
      ) : (
        <FolderList
          folders={folders.data ?? []}
          grouped={grouped}
          uncategorized={uncategorized}
        />
      )}
    </div>
  );
}

function SearchResults({
  results,
  folderById,
}: {
  results: Sop[];
  folderById: Map<string, SopFolder>;
}) {
  if (results.length === 0) {
    return <p className="text-ink-muted text-sm">No SOPs match your search.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border border border-border rounded-xl">
      {results.map((s) => (
        <SopRow
          key={s.id}
          sop={s}
          folderName={s.folder_id ? folderById.get(s.folder_id)?.name ?? "Uncategorized" : "Uncategorized"}
        />
      ))}
    </ul>
  );
}

function FolderList({
  folders,
  grouped,
  uncategorized,
}: {
  folders: SopFolder[];
  grouped: Map<string | null, Sop[]>;
  uncategorized: Sop[];
}) {
  const visibleFolders = folders.filter((f) => (grouped.get(f.id)?.length ?? 0) > 0);
  const hasUncat = uncategorized.length > 0;

  if (visibleFolders.length === 0 && !hasUncat) {
    return <p className="text-ink-muted text-sm">No SOPs available yet.</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      {visibleFolders.map((f) => (
        <FolderSection key={f.id} name={f.name} sops={grouped.get(f.id) ?? []} />
      ))}
      {hasUncat && <FolderSection name="Uncategorized" sops={uncategorized} />}
    </div>
  );
}

function FolderSection({ name, sops }: { name: string; sops: Sop[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Folder className="size-4 text-ink-muted" aria-hidden />
        <h2 className="text-lg text-ink">
          {name} <span className="text-ink-muted text-sm">({sops.length})</span>
        </h2>
      </div>
      <ul className="flex flex-col divide-y divide-border border border-border rounded-xl">
        {sops.map((s) => (
          <SopRow key={s.id} sop={s} />
        ))}
      </ul>
    </section>
  );
}

function SopRow({ sop, folderName }: { sop: Sop; folderName?: string }) {
  return (
    <li>
      <Link
        to="/app/tools/$key/$"
        params={{ key: "sops", _splat: sop.id }}
        className="flex items-start gap-3 px-5 py-4 hover:bg-[var(--surface-raised)] transition-colors"
      >
        <FileText className="size-4 text-ink-muted mt-0.5 shrink-0" aria-hidden />
        <div className="flex flex-col min-w-0">
          <span className="text-ink text-sm truncate">{sop.title}</span>
          {sop.description && (
            <span className="text-ink-muted text-xs line-clamp-2">{sop.description}</span>
          )}
          {folderName && (
            <span className="text-ink-muted text-xs mt-0.5">in {folderName}</span>
          )}
        </div>
      </Link>
    </li>
  );
}
