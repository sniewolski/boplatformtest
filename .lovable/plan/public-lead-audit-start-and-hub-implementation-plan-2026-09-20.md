# Public Lead Audit Start and Hub — Implementation Plan

## Scope
Build only the public entry, progress hub, and completion experience for the lead audit. The six audit forms remain out of scope, and all existing backend, owner, admin, export, and SalesCode code stays untouched.

## Routes and page behavior
- Add `/free-audit` with route-specific noindex metadata, concise audit context, name/email validation, the accessible honeypot, submit loading/error states, and an optional saved-device continuation link.
- Add `/free-audit/$token` with route-specific noindex metadata. Fetch the existing public state endpoint, reserve a stable loading layout, greet by first name, show six ordered section rows and their derived status, show completed count, and provide a copyable private return link.
- Add `/free-audit/$token/done` with route-specific noindex metadata and only the requested thank-you and selection/30-day-plan message.
- Use small public-only layout helpers where they reduce duplication; no app shell, sidebar, or dashboard elements.

## State and edge cases
- Store the returned token under one namespaced localStorage key after a successful start; all storage access is guarded so privacy mode or blocked storage cannot break the page.
- Read and validate the stored token on the start screen before showing the continuation link; never auto-redirect.
- Derive section state from `submitted_at`, draft/submitted answer presence, and `has_unsubmitted_changes`: completed, in progress, or not started.
- Redirect completed sessions from the hub to the dedicated completion route.
- Treat failed/non-JSON state responses and invalid tokens as a calm unavailable state linking back to `/free-audit`.
- Copy the absolute private URL with Clipboard API support and a safe fallback, with an accessible success/failure message.

## Visual implementation
- Use the existing Geist font and semantic neutral/red tokens only.
- Keep a quiet centered composition with varied spacing, 12–16px radii, visible focus states, and red reserved for the primary submit action.
- Use existing design-system buttons and inputs; interactions remain under 300ms, include `scale(0.97)` press feedback, and inherit reduced-motion handling.
- Keep the section list visually varied rather than an identical card grid; avoid gradients, warm surfaces, glass effects, badges, oversized headline treatment, and decorative imagery.
- Verify at 360px and desktop widths for wrapping, stable loading dimensions, focus visibility, and no overflow.

## Technical details
- All data uses `fetch` against `/api/public/audit-lead/start` and `/api/public/audit-lead/state`.
- Public screens do not import session state, the browser database client, or owner data hooks.
- Section destinations will be rendered as ordinary temporary links because their route files intentionally do not exist until the next phase; no section placeholder route or form will be added now.
- Add unique title, description, Open Graph title/description, `og:type`, `twitter:card`, and `robots: noindex,nofollow` metadata on each content route.

## Verification
- Run the project typecheck/build harness checks.
- Exercise start validation, loading/error states, valid hub state, invalid token state, completed-session redirect, clipboard behavior, and guarded device memory.
- Capture and inspect 360px and desktop screenshots without creating real lead records; use mocked network responses for stateful visual checks.
