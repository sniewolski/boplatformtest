import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/admin/lead-audits")({
  component: LeadAuditsLayout,
});

function LeadAuditsLayout() {
  return <Outlet />;
}
