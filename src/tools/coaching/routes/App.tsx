import type { ToolComponentProps } from "@/tools/registry";
import { useSession } from "@/core/auth/useSession";
import { CoachingLayout } from "../components/CoachingLayout";

/** Owner Coaching page: the signed-in owner's own thread and tasks. */
export function CoachingApp(_props: ToolComponentProps) {
  const { session } = useSession();
  const ownerId = session?.user?.id ?? null;
  return (
    <CoachingLayout
      header={<h1 className="text-2xl">Chat</h1>}
      ownerId={ownerId}
      viewerId={ownerId}
      viewer="owner"
    />
  );
}
