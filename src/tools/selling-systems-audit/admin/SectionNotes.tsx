import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useIsAdmin } from "@/core/roles/useMyRoles";
import {
  type AdminSectionKey,
  useSaveSectionNote,
  useSectionNote,
} from "./useAdminSection";

/**
 * Private coach notes for (owner, section). One row per pair. Admin-only.
 * Saves on blur. Quiet scaffolding — never owner-facing, no publish action.
 */
export function SectionNotes({
  ownerId,
  sectionKey,
}: {
  ownerId: string;
  sectionKey: AdminSectionKey;
}) {
  const noteQ = useSectionNote(ownerId, sectionKey);
  const saveMut = useSaveSectionNote(ownerId, sectionKey);
  const isAdmin = useIsAdmin();

  const [value, setValue] = useState("");
  const hydrated = useRef(false);

  // Hydrate once when the note query settles, then leave it to the user.
  useEffect(() => {
    if (hydrated.current) return;
    if (noteQ.isLoading) return;
    setValue(noteQ.data?.body ?? "");
    hydrated.current = true;
  }, [noteQ.isLoading, noteQ.data]);

  // If the owner changes (different ownerId mounts a new component, so this
  // primarily resets between section tabs), reset hydration.
  useEffect(() => {
    hydrated.current = false;
  }, [ownerId, sectionKey]);

  function handleBlur() {
    const current = (noteQ.data?.body ?? "").trim();
    const next = value.trim();
    if (current === next) return;
    saveMut.mutate(value);
  }

  return (
    <section className="flex flex-col gap-2" aria-label="Private coach notes">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-ink">Private notes</h3>
        <span className="text-xs text-ink-muted">
          {saveMut.isPending
            ? "Saving…"
            : saveMut.isError
              ? "Save failed"
              : noteQ.data?.updated_at
                ? "Saved"
                : "Admin-only"}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="Things to ask, follow up on, or remember about this section. Saved on blur."
        rows={5}
        className="resize-y"
        disabled={noteQ.isLoading}
      />
      {saveMut.isError && (
        <p className="text-xs text-[var(--red)]">
          {(saveMut.error as Error).message}
        </p>
      )}
    </section>
  );
}
