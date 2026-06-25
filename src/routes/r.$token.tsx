import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/r/$token")({
  head: () => ({
    meta: [
      { title: "Respondent — Sales Lab" },
      { name: "description", content: "Respondent session." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: () => <Outlet />,
});
