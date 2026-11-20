import { useEffect, useState } from "react";
import { createFileRoute, Navigate, notFound } from "@tanstack/react-router";
import { toolRegistry } from "@/tools/registry";
import { useMyRoles } from "@/core/roles/useMyRoles";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/tools/$key/$")({
  loader: ({ params }) => {
    const tool = toolRegistry.find((t) => t.key === params.key);
    if (!tool) throw notFound();
    return { tool };
  },
  component: ToolMountPoint,
  notFoundComponent: () => (
    <div className="max-w-2xl mx-auto px-8 py-16 flex flex-col gap-3">
      <h1 className="text-2xl">Tool not found</h1>
      <p className="text-ink-muted text-sm">No tool is registered for this URL.</p>
    </div>
  ),
});

function ToolMountPoint() {
  const { tool } = Route.useLoaderData();
  const params = Route.useParams() as { key: string; _splat?: string };
  const splat = params._splat ?? "";
  const [userId, setUserId] = useState<string | undefined>();
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then((r) => {
      if (!cancelled) setUserId(r.data.user?.id);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const roles = useMyRoles(userId);
  const isAdmin = !!roles.data?.includes("admin");
  // Roles resolve asynchronously; only treat the visitor as an owner once we
  // know, so admins are never redirected before their role loads.
  const rolesResolved = !!userId && !roles.isLoading;

  // Hidden tools are off for owners: a direct visit to their URL goes back to
  // the dashboard. Admins keep access so existing data stays reachable.
  if (tool.hidden) {
    if (!rolesResolved) return null;
    if (!isAdmin) return <Navigate to="/app" />;
  }

  // Tools flagged adminOnly render nothing usable for non-admins.
  if (tool.adminOnly && !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-16 flex flex-col gap-3">
        <h1 className="text-2xl">Tool not found</h1>
        <p className="text-ink-muted text-sm">No tool is registered for this URL.</p>
      </div>
    );
  }


  if (!tool.Component) {
    return (
      <div className="app-content py-16 flex flex-col gap-4">
        <h1 className="text-2xl">{tool.name}</h1>
        <p className="text-ink-muted text-sm">{tool.description}</p>
        <p className="text-ink-muted text-sm">This tool has no UI mounted yet.</p>
      </div>
    );
  }

  const ToolComponent = tool.Component;
  return <ToolComponent splat={splat} />;
}
