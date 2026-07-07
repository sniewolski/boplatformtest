import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useMyRoles } from "@/core/roles/useMyRoles";

export const Route = createFileRoute("/_authenticated/app/admin/sops")({
  component: SopsAdminLayout,
});

function SopsAdminLayout() {
  const { user } = Route.useRouteContext();
  const { data: roles, isLoading } = useMyRoles(user.id);

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-ink-muted text-sm">Loading…</p>
      </div>
    );
  }

  if (!roles?.includes("admin")) {
    return (
      <div className="max-w-md mx-auto px-8 py-16 text-center flex flex-col gap-3">
        <h1 className="text-2xl">Not authorised</h1>
        <p className="text-ink-muted text-sm">
          You don't have access to the admin area.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
