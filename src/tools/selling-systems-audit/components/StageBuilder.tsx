import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import type { SalesStage } from "../config";

const MIN_ROWS = 3;
const MAX_ROWS = 10;

const DEFAULT_STAGES: ReadonlyArray<Omit<SalesStage, "id">> = [
  { name: "Lead" },
  { name: "Qualified" },
  { name: "Discovery" },
  { name: "Proposal" },
  { name: "Negotiation" },
  { name: "Closed" },
];

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

/**
 * Returns the owner's current stages, pre-filled to the 6-stage default the
 * first time the field is touched. Stable IDs are minted once per row so
 * Step 4's Q20 can resolve selections back to names even after a rename.
 */
export function ensureDefaultStages(items: SalesStage[] | undefined): SalesStage[] {
  if (items && items.length > 0) return items;
  return DEFAULT_STAGES.map((s) => ({ id: newId(), ...s }));
}

/**
 * Repeatable list of sales stages. Hairline dividers between rows — not
 * nested cards — so the section reads as one block. Range 3–10 enforced
 * locally; the add/remove buttons hide at the bounds rather than going
 * disabled, which avoids the ambiguous "is this clickable?" state.
 *
 * Blank-name hint reserves its inline space so toggling validity never
 * shifts the row's height.
 */
export function StageBuilder({
  value,
  onChange,
}: {
  value: SalesStage[];
  onChange: (next: SalesStage[]) => void;
}) {
  const rows = value;

  function patch(idx: number, patch: Partial<SalesStage>) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function remove(idx: number) {
    if (rows.length <= MIN_ROWS) return;
    onChange(rows.filter((_, i) => i !== idx));
  }
  function add() {
    if (rows.length >= MAX_ROWS) return;
    onChange([...rows, { id: newId(), name: "" }]);
  }
  function move(idx: number, delta: -1 | 1) {
    const j = idx + delta;
    if (j < 0 || j >= rows.length) return;
    const next = rows.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }

  return (
    <div className="flex flex-col">
      <ol className="flex flex-col">
        {rows.map((row, idx) => {
          const blank = !row.name.trim();
          const canRemove = rows.length > MIN_ROWS;
          return (
            <li
              key={row.id}
              className={`flex flex-col gap-3 py-5 ${
                idx === rows.length - 1 ? "" : "border-b border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-ink-muted text-sm tabular-nums w-6 mt-2.5 shrink-0">
                  {idx + 1}.
                </span>
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => patch(idx, { name: e.target.value })}
                    placeholder="Stage name"
                    className="w-full max-w-md h-10 px-3 rounded-xl border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    aria-label={`Stage ${idx + 1} name`}
                  />
                  {/* Reserved inline space — hint shows when blank but height
                      is fixed so the row never jumps. */}
                  <p
                    className={`text-xs min-h-4 ${
                      blank ? "text-ink-muted" : "text-transparent"
                    }`}
                  >
                    Name this stage
                  </p>
                </div>
                <div className="flex items-center gap-1 mt-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    aria-label={`Move stage ${idx + 1} up`}
                    className="size-8 inline-flex items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-[var(--surface-raised)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-muted transition-colors"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === rows.length - 1}
                    aria-label={`Move stage ${idx + 1} down`}
                    className="size-8 inline-flex items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-[var(--surface-raised)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-muted transition-colors"
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      aria-label={`Remove stage ${idx + 1}`}
                      className="size-8 inline-flex items-center justify-center rounded-md text-ink-muted hover:text-ink hover:bg-[var(--surface-raised)] transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 pl-9">
                <input
                  type="text"
                  value={row.purpose ?? ""}
                  onChange={(e) => patch(idx, { purpose: e.target.value })}
                  placeholder="What happens in this stage (optional)"
                  className="w-full max-w-xl h-10 px-3 rounded-xl border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
                <input
                  type="text"
                  value={row.exitCriteria ?? ""}
                  onChange={(e) => patch(idx, { exitCriteria: e.target.value })}
                  placeholder="What has to be true to move on (optional)"
                  className="w-full max-w-xl h-10 px-3 rounded-xl border border-border bg-background text-ink text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
              </div>
            </li>
          );
        })}
      </ol>

      {rows.length < MAX_ROWS && (
        <button
          type="button"
          onClick={add}
          className="mt-4 inline-flex items-center gap-2 w-fit h-9 px-3 rounded-md text-sm text-ink-muted hover:text-ink hover:bg-[var(--surface-raised)] transition-colors"
        >
          <Plus className="size-4" />
          Add a stage
        </button>
      )}
      {rows.length >= MAX_ROWS && (
        <p className="mt-4 text-ink-muted text-xs">Maximum 10 stages.</p>
      )}
    </div>
  );
}
