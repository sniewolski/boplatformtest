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

  // Nav is composed at fixed positions: Business Brief is inserted directly
  // above Will AI. Will AI is filtered out of the registry .map, then both
  // are appended in the fixed order [BusinessBrief, WillAi]. Do not switch
  // this to a mid-iteration "when key === 'will-ai'" emit — it breaks if
  // the tool key changes or the entry is disabled.
  const willAiTool = toolRegistry.find((t) => t.key === "will-ai");
  const toolsWithoutWillAi = toolRegistry.filter(
    (t) => !!t.navEntry && t.key !== "will-ai",
  );

  const items: NavItem[] = [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard },
    ...toolsWithoutWillAi.map((t) => ({
      to: `/app/tools/${t.key}`,
      label: t.navEntry!.label,
      icon: t.icon!,
      complete:
        t.key === "selling-systems-audit"
          ? auditComplete
          : t.key === "salescode"
            ? salescodeComplete
            : undefined,
    })),
    {
      to: "/app/business-brief",
      label: "Business Brief",
      icon: Briefcase,
      needsAttention: briefNeedsAttention,
    },
    ...(willAiTool && willAiTool.navEntry
      ? [
          {
            to: `/app/tools/${willAiTool.key}`,
            label: willAiTool.navEntry.label,
            icon: willAiTool.icon!,
            disabled: willAiPausedForOwner,
          },
        ]
      : []),
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
            className="inline-flex items-center gap-2 text-ink font-semibold text-base"
            style={{ letterSpacing: "-0.02em" }}
          >
            <img src={logoAsset.url} alt="" className="size-5 shrink-0" />
            Sales Lab
          </Link>
        </div>

        <nav className="flex-1 min-h-0 overflow-hidden px-3 flex flex-col gap-1">
          {items.map((item) =>
            item.disabled ? (
              <div
                key={item.to}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink-muted cursor-not-allowed select-none"
                aria-disabled="true"
                title="Temporarily unavailable"
              >
                <item.icon className="size-4" />
                <span className="flex-1">{item.label}</span>
                <Lock className="size-3.5 shrink-0" aria-hidden />
              </div>
            ) : (
              <Link
                key={item.to}
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
              </Link>
            ),
          )}


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
              <Link
                to="/app/admin/sops"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink hover:bg-background transition-colors"
                activeProps={{ className: "bg-background font-medium" }}
              >
                <FileText className="size-4" />
                SOPs
              </Link>
              <Link
                to="/app/admin/will-ai"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-ink hover:bg-background transition-colors"
                activeProps={{ className: "bg-background font-medium" }}
              >
                <MessagesSquare className="size-4" />
                Will AI
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
