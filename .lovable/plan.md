# Pipeline Health — Build Plan

A new owner-intake section inside `selling-systems-audit`, mirroring Sales Conversion Rates Review patterns exactly (stepped flow, two-blob jsonb persistence, RLS, no analysis shown to owner). All primitives, currency, and design tokens already exist — nothing new gets invented.

I'll execute one phase at a time and stop for your confirmation after each. The phase order below is fixed by correctness (data → shell extraction → consumer) — sequencing within is the smallest safe path.

## Phase 0 — Overview scope change (no data)
- `config.ts` `AUDIT_SECTIONS`: 3 entries in order — `conversion` (available), `pipeline` (available, new description from spec), `content` (locked). Remove `infrastructure` and `marketing`.
- `routes/App.tsx`: add `if (segment === "pipeline") return <PipelineHealth />`.
- `routes/AuditOverview.tsx`: header copy → "A multi-part diagnostic of your selling system." + supporting line; "X of N" derives from `AUDIT_SECTIONS.length` (becomes 3); `completed` still only counts Conversion `submitted_at` (Pipeline table doesn't exist yet — do NOT query it).
- New `routes/PipelineHealth.tsx` placeholder: h2 + one `text-ink-muted` line.

**Acceptance:** 3 sections in order, Pipeline clickable to placeholder, Content locked, header updated, "X of 3", Conversion intact, no console errors.

## Phase 1 — Data layer
- Migration creates `selling_systems_audit_pipeline` (owner_id PK → auth.users, draft_answers jsonb, submitted_answers jsonb, has_unsubmitted_changes bool, submitted_at, updated_at) with: grants to authenticated + service_role, RLS enabled, 4 owner policies scoped to `auth.uid() = owner_id`, 1 admin-read-all using `public.has_role`, BEFORE UPDATE trigger using `public.touch_updated_at()`.
- `data/usePipelineReview.ts`: `usePipelineIntake`, `useSaveDraft`, `useSubmitIntake` — copy shape from `useConversionReview.ts`, `from(TABLE as never)` cast, 5m/30m cache.
- `config.ts`: `PIPELINE_STEPS`, all option sets (`TREND_OPTIONS`, `AGE_BANDS`, `PROPORTION_BANDS`, `STAGES_CANONICAL`, `DURATION_BANDS`, `FORECAST_METHODS`, `FORECAST_HORIZONS`, `REVIEW_CADENCES`, `TEAM_REVIEW_METHODS`, `REVIEW_DATA_POINTS`), `PipelineAnswers` type.
- Wire Pipeline `submitted_at` into Overview's `completed` count.

**Acceptance:** table + policies present, owner-isolated + admin read-all, hooks compile and round-trip, overview counts Pipeline submissions.

## Phase 2 — Shell extraction (with guardrail)
- Extract `ProgressBar`, `StepNav`, `StepHeader` from `ConversionReview.tsx` into `components/`, parameterised. `ProgressBar` takes a `steps` prop.
- Repoint `ConversionReview` at the extracted components.
- **Verify Conversion unchanged immediately** (step nav, jump, Saving/Saved, autosave, hydration) before anything new consumes them.

**Acceptance:** Conversion behaves identically; extracted components accept arbitrary `steps`.

## Phase 3 — Stepped shell for Pipeline
- Replace placeholder with the real `PipelineHealth` route: hydration guard (userId + !isLoading + per-key `if (d.x)`), refs (`latestDraftRef`/`dirtyRef`/`hasSubmittedRef`/`saveMutateRef`), `flushSave` (700ms debounce + commit-point flushes on blur capture, step nav, visibilitychange, unmount), Submit, ReceivedState, edit-after-submit note. Four empty steps mounted with extracted ProgressBar/StepNav/StepHeader.

**Acceptance:** end-to-end persistence works with zero fields. Refresh/navigate persists draft. Submit → Received. Edit after submit → note + Submit return.

## Phase 4 — Question UIs
- Step 1: A1 currency, A2b currency, coverage mirror (both-inputs + target>0 gate, neutral, no colour), A3 integer, A4 trend segmented. Money gated on `!!currency` via `needsCurrency` pattern.
- Step 2: B1 age band, B2 proportion, B3 proportion with cycle-length echo from `useConversionIntake`, B4 grouped stage+duration with "Other" text reveal.
- Step 3: C1 MaturitySpectrum, C2 horizon, C3 cadence, C4 YesNo gate → indented group (cadence + Chips/Other), C5 gated on cadence ≠ never (Chips + OptionalText).
- Step 4: read-back grouped by step (labels resolved via config, "—" for blanks). No analysis.

**Acceptance:** every field round-trips draft + submit; coverage mirror behaves; gating correct; B3 echoes cycle length; passes slop test.

---

Starting with Phase 0 on your go-ahead.
