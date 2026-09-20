import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/free-audit")({
  component: () => <Outlet />,
});