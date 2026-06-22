import { type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, Shield, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toolRegistry } from "@/tools/registry";
import { useMyRoles } from "@/core/roles/useMyRoles";
import { Button } from "@/components/ui/button";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
};

export function AppShell({
  userId,
  email,
  children,
}: {
  userId: string;
  email: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: roles = [] } = useMyRoles(userId);
  const isAdmin = roles.includes("admin");

  const items: NavItem[] = [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard },
    // Tool entries are data-driven from the registry. Empty in Phase 2.
    ...toolRegistry
      .filter((t) => !!t.navEntry)
      .map((t) => ({
        to: `/app/tools/${t.key}`,
        label: t.navEntry!.label,
        icon: LayoutDashboard,
      })),
  ];

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 shrink-0 border-r border-border bg-[var(--surface-raised)] flex flex-col">
        <div className="px-6 py-6">
          <Link
            to="/app"
            className="text-ink font-semibold text-base"
            style={{ letterSpacing: "-0.02em" }}
          >
            Platform
          </Link>
        </div>

        <nav className="flex-1 px-3 flex flex-col gap-1">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink hover:bg-background transition-colors"
              activeProps={{ className: "bg-background font-medium" }}
              activeOptions={{ exact: item.to === "/app" }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              to="/app/admin"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink hover:bg-background transition-colors"
              activeProps={{ className: "bg-background font-medium" }}
            >
              <Shield className="size-4" />
              Admin
            </Link>
          )}
        </nav>

        <div className="border-t border-border px-3 py-4 flex flex-col gap-2">
          <div className="px-3 text-xs text-ink-muted truncate" title={email}>
            {email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="justify-start text-ink-muted"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
