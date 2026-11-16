import { useState } from "react";
import type { ToolComponentProps } from "@/tools/registry";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/core/auth/useSession";
import { CoachingChat } from "../components/CoachingChat";
import { CoachingTasks } from "../components/CoachingTasks";

type Pane = "chat" | "tasks";

/**
 * Owner Coaching page.
 * Large screens: chat fills the centre, task panel on the right.
 * Smaller screens: "Chat" / "Tasks" tabs show one pane at a time.
 */
export function CoachingApp(_props: ToolComponentProps) {
  const { session } = useSession();
  const ownerId = session?.user?.id ?? null;
  const [pane, setPane] = useState<Pane>("chat");

  return (
    <div className="h-full min-h-0 flex flex-col lg:flex-row">
      {/* Phone / narrow header with tabs */}
      <div className="lg:hidden px-4 sm:px-6 pt-6 flex flex-col gap-4">
        <h1 className="text-2xl">Coaching</h1>
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
        <header className="hidden lg:block px-10 pt-10">
          <h1 className="text-2xl">Coaching</h1>
        </header>
        <CoachingChat ownerId={ownerId} visible={pane === "chat"} />
      </section>

      <aside
        aria-label="Your tasks"
        className={`${pane === "tasks" ? "flex" : "hidden"} lg:flex flex-col flex-1 lg:flex-none lg:w-80 shrink-0 min-h-0 overflow-y-auto lg:border-l border-border lg:bg-[var(--surface-raised)] lg:pt-4`}
      >
        <CoachingTasks ownerId={ownerId} />
      </aside>
    </div>
  );
}
