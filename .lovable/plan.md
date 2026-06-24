# Sales Process — Build Plan

New owner-intake section inside `selling-systems-audit`, mirroring Pipeline Health's patterns exactly. One new piece: the stage builder (Step 2). Everything else reuses existing primitives, shell, read-back, persistence, and data-layer shapes.

I'll execute one phase at a time and stop after each for your confirmation. Phase order is fixed by correctness: data → shell → stage builder → dependent fields (Step 4 Q20 derives from Step 2's stages).

## Phase 0 — Overview + route (no data)
- `config.ts` `AUDIT_SECTIONS`: insert `{ key: "process", label: "Sales Process", description: "How your sales process is defined…", status: "available" }` between `pipeline` and `content`. Order becomes: conversion, pipeline, process, content(locked). Count derives from `.length` → 4.
- `routes/App.tsx`: add `if (segment === "process") return <SalesProcess />;`.
- New `routes/SalesProcess.tsx` placeholder: h2 + one `text-ink-muted` line.
- Overview still only counts Conversion + Pipeline `submitted_at` (Process table doesn't exist yet).

**Acceptance:** 4 sections in order, Process clickable to placeholder, Content locked, "X of 4", Conversion + Pipeline intact, no console errors.

## Phase 1 — Data layer
- Migration creates `selling_systems_audit_process` (owner_id PK → auth.users, draft_answers jsonb, submitted_answers jsonb, has_unsubmitted_changes bool, submitted_at, updated_at) with: grants to authenticated + service_role, RLS enabled, 4 owner policies scoped to `auth.uid() = owner_id`, 1 admin read-all using `public.has_role`, BEFORE UPDATE trigger using `public.touch_updated_at()`.
- `data/useProcessReview.ts`: `useProcessIntake`, `useSaveDraft`, `useSubmitIntake` — copy shape from `usePipelineReview.ts`, `from(TABLE as never)` cast, 5m/30m cache.
- `config.ts`: `PROCESS_STEPS`, all option sets (`DOCUMENTATION_LEVELS`, `PROCESS_CONSISTENCY`, `REPLICABILITY`, `ADHERENCE`, `QUALITY_ASSESSMENT`, `SCRIPT_MOMENTS`, `EXPERIENCE_CONSISTENCY`, `CRM_OPTIONS`, `UPDATE_FREQUENCY`, `DOC_TEMPLATES`, `ENABLEMENT`), `ProcessAnswers` + `SalesStage` types.
- Wire Process `submitted_at` into Overview's `completed` count.

**Acceptance:** table + policies present, owner-isolated + admin read-all, hooks compile and round-trip, overview counts Process submissions, no type errors.

## Phase 2 — Stepped shell
- Replace placeholder with real `SalesProcess` route: hydration guard (userId + !isLoading + per-key `if (d.x)`), refs (`latestDraftRef`/`dirtyRef`/`hasSubmittedRef`/`saveMutateRef`), `flushSave` (700ms debounce + commit-point flushes on blur capture, step nav, visibilitychange, unmount), Submit, ReceivedState, edit-after-submit note. Five empty steps mounted with shared ProgressBar/StepNav/StepHeader. Copy Pipeline's structure verbatim.

**Acceptance:** end-to-end persistence with zero fields. Refresh/navigate persists. Submit → Received. Edit after submit → note + Submit return.

## Phase 3 — Stage builder
- New `components/StageBuilder.tsx`: repeatable row list (name input on top line, purpose + exit criteria below), each row has stable `id` from `crypto.randomUUID()`. Pre-filled 6 rows (Lead, Qualified, Discovery, Proposal, Negotiation, Closed). Range 3–10 enforced. Move-up/move-down per row (no drag lib). Hairline dividers — not nested cards. Soft validation: blank name → muted "Name this stage" hint with reserved inline space (no layout shift). Mount in Step 2 with a short intro line.

**Acceptance:** pre-fill works; add caps at 10; remove floors at 3; reorder works; rows round-trip through draft + submit + reload; blank-name hint shows without layout shift.

## Phase 4 — Remaining UIs + read-back
- Step 1: Q1 MaturitySpectrum; Q2/Q3 Segmented.
- Step 3: Q11 YesNoToggle → indented Adherence Segmented when Yes; Q12 MaturitySpectrum; Q13 Chips (+ Other); Q14 Segmented.
- Step 4: Q16 single-choice (+ Other text); Q17 Segmented gated on crm set and ≠ "none"; Q18/Q19 Chips (+ Other); Q20 derived Chips from `stages.items` (id→name), fallback muted note when empty, stale ids silently ignored.
- Read-back: extend `ReadBack.tsx` with `ReadStages` (name + purpose + exit, blanks "—"). Step 5 mirrors all four steps in order; Q20 resolves ids → names dropping stale. Submit block copied from Pipeline's review.

**Acceptance:** every field round-trips; Q11/Q17 gating correct; Q20 lives off Step 2's stages with empty + stale-id handling; read-back covers all steps; passes slop test.

---

Starting Phase 0 on your go-ahead.
