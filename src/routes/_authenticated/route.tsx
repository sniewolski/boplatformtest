import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/core/auth/useProfile";
import { AppShell } from "@/core/shell/AppShell";
import { Button } from "@/components/ui/button";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  // localStorage session can't be read during SSR; gate is client-only.
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/login" });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const { data: profile, isLoading, error } = useMyProfile(user.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-ink-muted text-sm">Loading…</p>
      </div>
    );
  }

  if (error || !profile) {
    return <PausedAccount reason="missing" email={user.email ?? ""} />;
  }

  if (profile.account_status === "suspended") {
    return <PausedAccount reason="suspended" email={user.email ?? ""} />;
  }

  return (
    <AppShell userId={user.id} email={user.email ?? ""}>
      <Outlet />
    </AppShell>
  );
}

function PausedAccount({
  reason,
  email,
}: {
  reason: "suspended" | "missing";
  email: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/login", replace: true });
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <section className="w-full max-w-md text-center flex flex-col gap-6">
        <h1 className="text-2xl">Account paused</h1>
        <p className="text-ink-muted text-sm">
          {reason === "suspended"
            ? "Your account is currently suspended. Contact an administrator to reinstate access."
            : "Your account isn't fully set up yet. An administrator needs to finish provisioning it."}
        </p>
        {email && <p className="text-xs text-ink-muted">Signed in as {email}</p>}
        <div>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </section>
    </main>
  );
}
