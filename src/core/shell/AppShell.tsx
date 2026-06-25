import { useEffect, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { Check, LayoutDashboard, Shield, ClipboardList, LogOut, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toolRegistry } from "@/tools/registry";
import { useMyRoles } from "@/core/roles/useMyRoles";
import { useBookingReadiness } from "@/lib/useBookingReadiness";
import { Button } from "@/components/ui/button";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  complete?: boolean;
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
  const { isLoading: readinessLoading, incomplete } = useBookingReadiness(userId);

  const AUDIT_KEYS = new Set([
    "conversion",
    "pipeline",
    "process",
    "activity",
    "messaging",
    "alignment",
  ]);
  const incompleteKeys = new Set(incomplete.map((i) => i.key));
  const auditComplete =
    !readinessLoading && ![...AUDIT_KEYS].some((k) => incompleteKeys.has(k));
  const salescodeComplete = !readinessLoading && !incompleteKeys.has("salescode");

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlHeight = html.style.height;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyHeight = body.style.height;

    html.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.overflow = "hidden";
    body.style.height = "100%";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      html.style.height = previousHtmlHeight;
      body.style.overflow = previousBodyOverflow;
      body.style.height = previousBodyHeight;
    };
  }, []);

  const items: NavItem[] = [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard },
    // Tool entries are data-driven from the registry. Empty in Phase 2.
    ...toolRegistry
      .filter((t) => !!t.navEntry)
      .map((t) => ({
        to: `/app/tools/${t.key}`,
        label: t.navEntry!.label,
        icon: LayoutDashboard,
        complete:
          t.key === "selling-systems-audit"
            ? auditComplete
            : t.key === "salescode"
              ? salescodeComplete
              : undefined,
      })),
    { to: "/app/book-call", label: "Book a 1:1 call", icon: CalendarDays },
  ];

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/login", replace: true });
  }

  return (
    <div className="flex bg-background" style={{ height: "100dvh", overflow: "hidden" }}>
      <aside className="w-64 shrink-0 border-r border-border bg-[var(--surface-raised)] flex flex-col h-full">
        <div className="px-6 py-6">
          <Link
            to="/app"
            className="text-ink font-semibold text-base"
            style={{ letterSpacing: "-0.02em" }}
          >
            Platform
          </Link>
        </div>

        <nav className="flex-1 min-h-0 overflow-hidden px-3 flex flex-col gap-1">
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
            <>
              <div className="h-px bg-border mx-6" />
              <div className="px-6 py-6">
                <span
                  className="text-ink-muted font-semibold text-base"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Admin
                </span>
              </div>
              <Link
                to="/app/admin"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink hover:bg-background transition-colors"
                activeProps={{ className: "bg-background font-medium" }}
                activeOptions={{ exact: true }}
              >
                <Shield className="size-4" />
                Admin
              </Link>
              <Link
                to="/app/admin/review"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink hover:bg-background transition-colors"
                activeProps={{ className: "bg-background font-medium" }}
              >
                <ClipboardList className="size-4" />
                Review
              </Link>
            </>
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

      <main className="flex-1 min-w-0 min-h-0 h-full overflow-y-auto">{children}</main>
    </div>
  );
}
