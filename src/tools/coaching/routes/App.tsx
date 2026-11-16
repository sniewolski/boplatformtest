import type { ToolComponentProps } from "@/tools/registry";

/**
 * Coaching tool root. Placeholder until the chat and task UI phases land.
 */
export function CoachingApp(_props: ToolComponentProps) {
  return (
    <div className="app-content py-16 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Coaching</h1>
      </header>
    </div>
  );
}
