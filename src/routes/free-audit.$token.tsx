import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/free-audit/$token")({
  component: () => <Outlet />,
});