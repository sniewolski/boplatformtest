<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Sales OS Audit admin reads use the dedicated read-only data module and shared pure review-status helper; never mount owner autosave hooks in a viewed-owner review, to avoid writing or mixing identities.
- Keep Vitest configured independently of the Vite route-splitting plugins so tests can render route components directly.
- Coaching data lives in src/tools/coaching/data/ (coaching.ts shared, coachingAdmin.ts admin-only) plus src/lib/useCoachingInbox.ts for the shell badge; owner and admin pages share one set of components switched by a viewer prop, and owners get staff names only via get_coaching_sender_names(), never by widening profiles RLS.
