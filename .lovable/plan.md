
# Build plan — Skeleton platform

This will be built in three phases. **Phase 1 ships first, then I stop and wait for your sign-off before Phase 2.** Phase 2 and 3 are outlined here so you can see the shape, but no code for them lands until you approve Phase 1.

Heads-up on stack: the project template is **TanStack Start** (React + TS + Vite + Tailwind v4 + shadcn), not plain Vite + React Router. I'll honour every design and architectural constraint you set; the only adaptation is routing primitives (file-based routes under `src/routes/`, `<Link>` from `@tanstack/react-router`) and Tailwind v4's CSS-first config (tokens in `src/styles.css` under `@theme inline`, no `tailwind.config.ts`). The token names, values, mapping behaviour, and "override neutrals, don't augment" rule are unchanged. Backend will be Lovable Cloud (managed Supabase — Auth, Postgres + RLS, Edge Functions); I'll enable it at the start of Phase 2.

---

## Phase 1 — Foundation + design system (ship, then STOP)

Goal: prove the tokens render. No app, no auth, no routing logic beyond the single placeholder screen.

1. **Install Geist** via `@fontsource-variable/geist` (self-hosted, no remote `@import`). Wire weights 400 / 500 / 600 in `src/styles.css`.
2. **Rewrite `src/styles.css`** — replace the current shadcn zinc/slate palette wholesale:
   - Declare the OKLCH tokens exactly as specified (`--white`, `--surface-raised`, `--border`, `--border-strong`, `--ink-muted`, `--ink`, `--black`, `--red`, `--red-pressed`, `--red-tint`, `--ring`) in `:root`.
   - Map shadcn variables onto these tokens (`--background → --white`, `--foreground → --ink`, `--primary → --red`, etc.) so re-skinning any component = changing one token.
   - `--radius: 0.75rem` (12px), with the existing `--radius-sm/md/lg/xl` derivations capped so cards/inputs land 12–16px.
   - Register tokens under `@theme inline` so utilities like `bg-white`, `text-ink`, `bg-red`, `border-border` resolve to the ramp (Tailwind v4 equivalent of extending `theme.colors`). The default neutral palette is overridden, not augmented — `zinc`/`slate`/`gray` will not appear in this project.
   - Add `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` and a base `@layer base` rule applying `text-wrap: balance` to h1–h3, `text-wrap: pretty` to `p`, body font Geist 400 / 1.6, body color `--ink`, background `--white`.
   - Define a semantic z-index scale as CSS custom properties (dropdown / sticky / modal-backdrop / modal / toast / tooltip).
   - Add a `prefers-reduced-motion` block that disables transitions/animations.
3. **Re-skin the shadcn Button** so its `default` variant uses `--red` / `--red-pressed`, with `active:scale-[0.97]` and a 120ms transform transition using `--ease-out`. Focus ring uses `--ring`. Radius capped at 12px. (Other shadcn primitives keep their existing structure — they already read the variables I'm remapping, so they re-skin automatically.)
4. **Replace `src/routes/index.tsx`** with the single placeholder screen:
   - Centered wordmark (Geist 600, `--ink`, letter-spacing `-0.02em`, size from the H1 clamp).
   - One line of body text (`--ink`) and one line of muted text (`--ink-muted`) — verify the muted line is still ≥4.5:1 on white.
   - One primary red Button with the scale-press feedback.
   - Surface is `--white`. No cards, no eyebrows, no gradients, no decoration.
   - Update `head()` title + description to something non-generic (e.g. "Platform — sign in").
5. **Verify with Playwright**: load `/`, screenshot at 1280×1800, confirm: chroma-0 background, ink text, red button, Geist loaded (computed `font-family` check), button radius 12px, press scales to 0.97.

After Phase 1 lands I stop and wait. Nothing else gets built until you confirm the screen looks right.

---

## Phase 2 — App shell + auth + roles + access gating (after your sign-off)

- Enable Lovable Cloud.
- Migrations: `app_role` enum, `user_roles` (PK `(user_id, role)`, RLS: self-read only, writes service-role only, GRANTs), `has_role(uuid, app_role)` SECURITY DEFINER with `set search_path = ''`, `profiles` (`account_status` check `active|suspended`, GRANTs, self-read/self-update RLS plus admin-all via `has_role`).
- Edge Function `admin-provision-owner` (service role): `createUser({ email_confirm: true })` → insert profile (active) → insert `user_roles` row (`owner`). Caller must be admin (verified server-side via `has_role`). `notify()` stub lives here as a named seam.
- Client auth: email OTP only — `signInWithOtp({ email, options: { shouldCreateUser: false } })` then `verifyOtp`. Generic "if your email is registered, a code is on the way" message.
- Routing zones under `src/routes/`:
  - Public: `index.tsx` (entry → login CTA), `login.tsx`, `r.$token.tsx` + `r.$token.$.tsx` (respondent shell, real flow in Phase 3).
  - Authed: `_authenticated.tsx` (layout running `RequireAuth` + `RequireActiveAccount`, redirects unauth → `/login`, suspended → calm paused state), `_authenticated.app.index.tsx` (near-empty owner dashboard, "no tools yet" — not a card grid), `_authenticated.app.tools.$key.$.tsx` (delegates to registry), `_authenticated.app.admin._layout.tsx` (adds `RequireRole role="admin"`), `_authenticated.app.admin.index.tsx` (provision + suspend/reinstate UI).
- Composable guards live in `src/core/auth/` and `src/core/roles/`, each doing one thing.
- Role-aware, data-driven nav in `src/core/shell/` reading from the (still empty) tool registry; admin nav only shows for admins. Sidebar `--surface-raised`, content `--white`. No nested cards.

## Phase 3 — Data model + tool-mount pattern + respondent infra

- `src/tools/registry.ts` exports an empty `toolRegistry: ToolManifest[]`. Manifest type matches your spec (key, name, description, icon, appRoutes, optional publicRoutes, navEntry, dashboardWidget). Shell builds nav + dashboard widgets + tool routes from this array.
- ESLint `no-restricted-imports` rule blocks `src/tools/*` from importing siblings and blocks `src/core/*` from importing `src/tools/*`.
- Migration: `respondent_sessions` exactly as specified (token unique, owner_id FK, tool_key, status check, nullable `expires_at` + `consent` seams) with the canonical four-policy RLS set scoped to `owner_id = auth.uid() OR has_role(auth.uid(),'admin')` and GRANTs. No anon access — respondents never touch this table from the client.
- Edge Function helpers under `supabase/functions/_shared/respondent.ts`: `validateToken`, `captureRespondent`, `markCompleted` (service role). Three thin Edge Functions wrap them for the respondent client.
- Owner-side: small helper to create a session (insert row with high-entropy token, `tool_key`, `owner_id = auth.uid()`).
- Public `/r/:token` page: calls `validateToken`, shows name/email capture form if missing, posts to `captureRespondent`, then renders a neutral "thanks, no tool to run yet" placeholder. No tool flow built.

## Out of scope (named seams, no code)

Email send (`notify()` stub only), GDPR/consent/retention (columns exist, unused), token hashing / rate-limiting / expiry enforcement (lives in `_shared/respondent.ts` later), any actual tool, per-tool entitlements, payments, Supabase Storage.

---

## Technical notes

- **TanStack Start adaptation:** routes are files under `src/routes/`, not `<BrowserRouter>`. `_authenticated.tsx` is the standard layout-gate convention; the existing template already wires `attachSupabaseAuth` so server functions can use `requireSupabaseAuth` once Cloud is enabled. The `ToolManifest.appRoutes` shape will use TanStack route objects (a thin shim) rather than `react-router-dom`'s `RouteObject` — the contract (one array, one line to register a tool) is identical.
- **Tailwind v4:** no `tailwind.config.ts`. Tokens + `@theme inline` mapping live entirely in `src/styles.css`. Custom variants via `@custom-variant`. This is the supported v4 path and gives the same "change one token, re-skin everything" behaviour.
- **Fonts:** `@fontsource-variable/geist` only — no `@import` of a Google Fonts URL (Lightning CSS would fail the build).
- **Verification:** after Phase 1 I'll drive Playwright headless to screenshot `/` and confirm computed styles (font-family contains Geist, button background matches `--red`, border-radius 12px) before handing back to you.

I'll start Phase 1 as soon as you approve this plan.
