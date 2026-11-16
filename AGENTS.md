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
- Coaching data lives in src/tools/coaching/data/ (coaching.ts shared, coachingAdmin.ts admin-only) plus src/lib/useCoachingInbox.ts for the shell badge; owner and admin pages share one set of components switched by a viewer prop, and owners get staff names only via get_coaching_sender_names(), never by widening profiles RLS. Coaching Realtime channels open only through useCoachingRealtime in src/tools/coaching/lib/realtime.ts (unique channel per subscription, removed on unmount) so live updates keep one RLS-respecting, leak-free code path.
- App emails go through enqueueTransactionalEmail in src/lib/email/transactional.ts (shared by the send route and server-side triggers) and render with `react-email` like the auth webhook; importing `@react-email/render` from route files hung Vite's dependency optimizer.
- Coaching reply emails: an AFTER INSERT trigger on coaching_messages claims the per-owner 15-minute slot in coaching_notifications and pings /api/public/coaching/reply-notify via pg_net with only the message id; the route queues an email only by atomically consuming that unconsumed claim, so the public route needs no secret and replays send nothing.
- Account suspension is enforced at the auth level: setAccountStatus (src/lib/admin.functions.ts) bans the user before writing profiles.account_status and lifts the ban on reactivate, so suspended users cannot sign in or refresh sessions; the app-side paused screen alone is not a cut-off.
