import { useEffect, type ReactNode, type ComponentType } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { Check, LayoutDashboard, Lock, Shield, ClipboardList, FileText, LogOut, CalendarDays, MessagesSquare, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toolRegistry } from "@/tools/registry";
import { useMyRoles } from "@/core/roles/useMyRoles";
import { useBookingReadiness } from "@/lib/useBookingReadiness";
import { useWillAiSettings } from "@/lib/useWillAiSettings";
import { useBusinessBriefNeedsAttention } from "@/core/business-brief/useBusinessBrief";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/logo.png.asset.json";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  complete?: boolean;
  needsAttention?: boolean;
  disabled?: boolean;
  navGroup?: string;
};

const NAV_GROUPS: { key: string; label: string }[] = [
  { key: "coaching", label: "Coaching" },
  { key: "resources", label: "Resources" },
];




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
  const isMentor = roles.includes("mentor");
  const showAdminSection = isAdmin || isMentor;
  const { isLoading: readinessLoading, incomplete } = useBookingReadiness(userId);
  const { data: willAiSettings } = useWillAiSettings();
  const willAiPausedForOwner =
    willAiSettings?.owner_access_enabled === false && !isAdmin;


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

  const briefNeedsAttention = useBusinessBriefNeedsAttention();

  // Build items from the registry; grouping is driven by navEntry.navGroup.
  // Business Brief and Book a 1:1 call are not registry tools — they are
  // assigned to groups explicitly below. Dashboard is always first, ungrouped.
  const registryItems: NavItem[] = toolRegistry
    .filter((t) => !!t.navEntry)
    .map((t) => ({
      to: `/app/tools/${t.key}`,
      label: t.navEntry!.label,
      icon: t.icon!,
      navGroup: t.navEntry!.navGroup,
      complete:
        t.key === "selling-systems-audit"
          ? auditComplete
          : t.key === "salescode"
            ? salescodeComplete
            : undefined,
      disabled: t.key === "will-ai" ? willAiPausedForOwner : undefined,
    }));

  const businessBriefItem: NavItem = {
    to: "/app/business-brief",
    label: "Business Brief",
    icon: Briefcase,
    navGroup: "resources",
    needsAttention: briefNeedsAttention,
  };

  const bookCallItem: NavItem = {
    to: "/app/book-call",
    label: "Book a 1:1 call",
    icon: CalendarDays,
    navGroup: "coaching",
  };

  const dashboardItem: NavItem = {
    to: "/app",
    label: "Dashboard",
    icon: LayoutDashboard,
  };

  const allGrouped: NavItem[] = [...registryItems, businessBriefItem, bookCallItem];

  // Preserve registry order within each group; Business Brief lands at the
  // top of "resources" and Book a 1:1 call at the bottom of "coaching".
  const groupBuckets = new Map<string, NavItem[]>();
  for (const g of NAV_GROUPS) groupBuckets.set(g.key, []);
  const ungroupedItems: NavItem[] = [];
  for (const item of allGrouped) {
    if (item.navGroup && groupBuckets.has(item.navGroup)) {
      groupBuckets.get(item.navGroup)!.push(item);
    } else {
      ungroupedItems.push(item);
    }
  }
  // Position book-call last in coaching; business-brief first in resources.
  const coaching = groupBuckets.get("coaching") ?? [];
  const coachingOrdered = [
    ...coaching.filter((i) => i.to !== "/app/book-call"),
    ...coaching.filter((i) => i.to === "/app/book-call"),
  ];
  groupBuckets.set("coaching", coachingOrdered);
  const resources = groupBuckets.get("resources") ?? [];
  const resourcesOrdered = [
    ...resources.filter((i) => i.to === "/app/business-brief"),
    ...resources.filter((i) => i.to !== "/app/business-brief"),
  ];
  groupBuckets.set("resources", resourcesOrdered);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/login", replace: true });
  }

  function renderItem(item: NavItem) {
    if (item.disabled) {
      return (
        <li key={item.to} className="list-none">
          <div
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-muted cursor-not-allowed select-none"
            aria-disabled="true"
            title="Temporarily unavailable"
          >
            <item.icon className="size-4" />
            <span className="flex-1">{item.label}</span>
            <Lock className="size-3.5 shrink-0" aria-hidden />
          </div>
        </li>
      );
    }
    return (
      <li key={item.to} className="list-none">
        <Link
          to={item.to}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink hover:bg-background transition-colors"
          activeProps={{ className: "bg-background font-medium" }}
          activeOptions={{ exact: item.to === "/app" }}
        >
          <item.icon className="size-4" />
          <span className="flex-1">{item.label}</span>
          {item.complete && (
            <Check
              className="size-4 text-ink shrink-0"
              strokeWidth={2.5}
              aria-label="Complete"
            />
          )}
          {item.needsAttention && (
            <span
              className="size-2 rounded-full bg-[var(--red)] shrink-0"
              aria-label="Needs attention"
            />
          )}
        </Link>
      </li>
    );
  }

  return (
    <div className="flex bg-background" style={{ height: "100dvh", overflow: "hidden" }}>
      <aside className="w-64 shrink-0 border-r border-border bg-[var(--surface-raised)] flex flex-col h-full">
        <div className="px-6 py-6">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 text-ink font-semibold text-base"
            style={{ letterSpacing: "-0.02em" }}
          >
            <img src={logoAsset.url} alt="" className="size-5 shrink-0" />
            Sales Lab
          </Link>
        </div>

        <nav className="flex-1 min-h-0 overflow-hidden px-3 flex flex-col">
          <ul className="flex flex-col gap-1 list-none">
            {renderItem(dashboardItem)}
          </ul>

          {NAV_GROUPS.map((group) => {
            const groupItems = groupBuckets.get(group.key) ?? [];
            if (groupItems.length === 0) return null;
            const labelId = `nav-group-${group.key}`;
            return (
              <div key={group.key} className="mt-5">
                <div
                  id={labelId}
                  className="px-3 pb-1 text-xs font-medium text-ink-muted"
                >
                  {group.label}
                </div>
                <ul
                  aria-labelledby={labelId}
                  className="flex flex-col gap-1 list-none"
                >
                  {groupItems.map(renderItem)}
                </ul>
              </div>
            );
          })}

          {ungroupedItems.length > 0 && (
            <ul className="mt-5 flex flex-col gap-1 list-none">
              {ungroupedItems.map(renderItem)}
            </ul>
          )}




          {showAdminSection && (
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
              {isAdmin && (
                <Link
                  to="/app/admin"
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink hover:bg-background transition-colors"
                  activeProps={{ className: "bg-background font-medium" }}
                  activeOptions={{ exact: true }}
                >
                  <Shield className="size-4" />
                  Admin
                </Link>
              )}
              <Link
                to="/app/admin/review"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink hover:bg-background transition-colors"
                activeProps={{ className: "bg-background font-medium" }}
              >
                <ClipboardList className="size-4" />
                Review
              </Link>
              <Link
                to="/app/admin/sops"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink hover:bg-background transition-colors"
                activeProps={{ className: "bg-background font-medium" }}
              >
                <FileText className="size-4" />
                SOPs
              </Link>
              {isAdmin && (
                <Link
                  to="/app/admin/will-ai"
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink hover:bg-background transition-colors"
                  activeProps={{ className: "bg-background font-medium" }}
                >
                  <MessagesSquare className="size-4" />
                  Will AI
                </Link>
              )}
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
