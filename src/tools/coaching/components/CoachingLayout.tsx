import { useState, type ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoachingChat, type CoachingViewer } from "./CoachingChat";
import { CoachingTasks } from "./CoachingTasks";

type Pane = "chat" | "tasks";

/**
 * Shared Coaching thread layout for the owner page and the admin thread page.
 * Large screens: chat fills the centre, task panel on the right.
 * Smaller screens: "Chat" / "Tasks" tabs show one pane at a time.
 */
export function CoachingLayout({
  header,
  ownerId,
  viewerId,
  viewer,
  ownerName,
}: {
  header: ReactNode;
  ownerId: string | null;
  viewerId: string | null;
  viewer: CoachingViewer;
  ownerName?: string;
}) {
  const [pane, setPane] = useState<Pane>("chat");
  const tasksLabel = viewer === "admin" ? "Tasks" : "Your tasks";

  return (
    <div className="h-full min-h-0 flex flex-col lg:flex-row">
      <div className="lg:hidden px-4 sm:px-6 pt-6 flex flex-col gap-4">
        {header}
        <Tabs value={pane} onValueChange={(v) => setPane(v as Pane)}>
          <TabsList className="w-full">
            <TabsTrigger value="chat" className="flex-1">
              Chat
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1">
              Tasks
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <section
        aria-label="Chat"
        className={`${pane === "chat" ? "flex" : "hidden"} lg:flex flex-1 min-w-0 min-h-0 flex-col`}
      >
        <div className="hidden lg:block px-10 pt-10">{header}</div>
        <CoachingChat
          ownerId={ownerId}
          viewerId={viewerId}
          viewer={viewer}
          ownerName={ownerName}
          visible={pane === "chat"}
        />
      </section>

      <aside
        aria-label={tasksLabel}
        className={`${pane === "tasks" ? "flex" : "hidden"} lg:flex flex-col flex-1 lg:flex-none lg:w-80 shrink-0 min-h-0 overflow-y-auto lg:border-l border-border lg:bg-[var(--surface-raised)] lg:pt-4`}
      >
        <CoachingTasks ownerId={ownerId} viewerId={viewerId} viewer={viewer} />
      </aside>
    </div>
  );
}
