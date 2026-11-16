import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { CoachingLayout } from "@/tools/coaching/components/CoachingLayout";
import { useCoachingOwnerProfile } from "@/tools/coaching/data/coachingAdmin";

export const Route = createFileRoute("/_authenticated/app/admin/coaching/$ownerId")({
  component: CoachingAdminThread,
  head: () => ({
    meta: [
      { title: "Chat thread · Sales Lab admin" },
      { name: "description", content: "Private coaching thread and task list for one owner." },
      { property: "og:title", content: "Chat thread · Sales Lab admin" },
      { property: "og:description", content: "Private coaching thread and task list for one owner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CoachingAdminThread() {
  const { ownerId } = Route.useParams();
  const { user } = Route.useRouteContext();
  const profile = useCoachingOwnerProfile(ownerId);
  const name = profile.data?.full_name?.trim() || profile.data?.email || (profile.isLoading ? "" : "Owner");

  const header = (
    <div className="flex flex-col gap-2">
      <Link
        to="/app/admin/coaching"
        className="inline-flex items-center gap-1.5 self-start text-sm text-ink-muted hover:text-ink rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Chat inbox
      </Link>
      <h1 className="text-2xl min-h-8 break-words">{name}</h1>
    </div>
  );

  return (
    <CoachingLayout
      key={ownerId}
      header={header}
      ownerId={ownerId}
      viewerId={user.id}
      viewer="admin"
      ownerName={name || "Owner"}
    />
  );
}
