# Messaging & Positioning — Build Plan

New owner-intake section inside `selling-systems-audit`, mirroring the Sales Activity section's machinery (config-driven steps, two-blob jsonb + RLS, shared IntakeFields/StepShell/ReadBack, no analysis shown to owner).

Distinct from prior sections: text-heavy by design — the owner's actual words (value props, differentiation, proof) are the diagnostic payload and stay as open text.

## Phases (one at a time, stop after each)

### Phase 0 — Overview + route stub
- Add `{ key: "messaging", label: "Messaging & Positioning", description: …, status: "available" }` to `AUDIT_SECTIONS` in `config.ts`, ordered: conversion, pipeline, process, activity, **messaging**, content(locked).
- Branch in `routes/App.tsx`: `if (segment === "messaging") return <Messaging />;`
- New `routes/Messaging.tsx` — placeholder (heading + muted line).
- Verify: overview shows 6 sections in correct order, Messaging clickable to placeholder, "X of 6" math correct.

### Phase 1 — Data layer
- Migration: `selling_systems_audit_messaging` table (mirror activity table): owner_id PK → auth.users CASCADE, draft_answers jsonb, submitted_answers jsonb, has_unsubmitted_changes bool, submitted_at, updated_at. Grants to authenticated + service_role. RLS on. 4 owner policies scoped to `auth.uid() = owner_id` (SELECT/INSERT/UPDATE/DELETE) + 1 admin read-all via `has_role`. BEFORE UPDATE trigger → `touch_updated_at`.
- `config.ts`: add `MESSAGING_STEPS` (6 steps including review) + all option sets (ICP_WRITTEN, ICP_BASIS, YES_SOMEWHAT_NO, RECOGNITION, MESSAGE_LEVEL, CAN_TELL, COMPETE_BASIS, EVIDENCE_TYPES, PROOF_SPECIFICITY, PROOF_TARGETING, CONSISTENCY_LEVELS, MATCH_LEVELS) + `MessagingAnswers` type nested by step.
- `data/useMessagingReview.ts`: mirror `useActivityReview.ts` — `useMessagingIntake` / `useSaveDraft` / `useSubmitIntake`, same cache/cast/dirty-flag.
- Wire `AuditOverview` to subscribe to `useMessagingIntake` and bump `completed` when `submitted_at` set.

### Phase 2 — Stepped shell
- Replace placeholder `routes/Messaging.tsx` with full shell mirroring `SalesActivity.tsx`:
  - Hydration guard, 700ms debounced autosave, refs for last-saved/latest/dirty/hasSubmitted, commit-point flushes (blurCapture, step nav, visibilitychange, unmount).
  - 6 empty steps using `ProgressBar` / `StepHeader` / `StepNav`.
  - `ReviewStep` with Submit logic + `ReceivedState` + edit-after-submit.
- Verify end-to-end persistence with no fields.

### Phase 3 — Question UIs + read-back
- Add `TextField` to `IntakeFields.tsx` (single-line, matching existing input styling) if no equivalent primitive exists.
- Add `ReadText({ label, value })` to `ReadBack.tsx` — label on its own line, full-width wrapped prose beneath, "—" if blank.
- Step 1 (icp): structured group inside one `Question` — Industry/CompanySize/Role as short single-line fields in a tidy row (sized to content), Situation/Mindset as `OptionalText` 2-row full-width beneath. Then Q2 `MaturitySpectrum` (ICP_WRITTEN), Q3 `Segmented` (ICP_BASIS).
- Step 2 (problem): Q6 `OptionalText`; Q7/Q8/Q9 `Segmented`.
- Step 3 (value): structured value-prop group (Outcome `OptionalText` full-width + For whom/Timeframe short fields side-by-side); Q12 `OptionalText`; differentiation group (open + "Can prospects tell?" Segmented); Q14 Segmented; Q15 `OptionalText`.
- Step 4 (proof): Q16 `Chips` with "other" reveal → `evidenceOther` text; Q17/Q18 `Segmented`; Q19 `OptionalText`.
- Step 5 (consistency): Q21/Q22 `Segmented`.
- Step 6 (review): `ReadGroup` per step in order — single-selects via `labelOf`, chips via `chipsLabels`, open text via `ReadText`, short structured sub-fields via `ReadRow`, blanks "—". Then Submit block.

## Dependencies (fixed)
Phase 0 → Phase 1 (migration must exist before any query) → Phase 2 (shell needs hooks) → Phase 3 (fields need shell).

## Reuse — do not rebuild
`IntakeFields` (Segmented, MaturitySpectrum, Chips, OptionalText, Question), `StepShell` (ProgressBar, StepNav, StepHeader), `ReadBack` (labelOf, chipsLabels, ReadRow, ReadGroup). Only additions: `TextField` (if needed) and `ReadText`.

## Constraints (pinned)
No analysis/scores shown to owner. Design tokens only — `bg-ink`, `text-ink-muted`, `border-border`. Segmented controls hug content, left-aligned. Text inputs may be full-width within content column. No new colours, no diagnostic colour. Don't convert specified text fields into bands. No cross-tool imports.

Confirm to proceed with **Phase 0**.