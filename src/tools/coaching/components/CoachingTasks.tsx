import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useCoachingTasks, useSetCoachingTaskDone } from "../data/coaching";

export function CoachingTasks({ ownerId }: { ownerId: string | null }) {
  const tasks = useCoachingTasks(ownerId);
  const setDone = useSetCoachingTaskDone(ownerId);
  const [failed, setFailed] = useState(false);
  const rows = tasks.data ?? [];

  return (
    <div className="flex flex-col gap-4 px-4 sm:px-6 py-6">
      <h2 className="text-lg font-medium text-ink" style={{ letterSpacing: "-0.01em" }}>
        Your tasks
      </h2>

      {tasks.isLoading && <p className="text-ink-muted text-sm">Loading tasks…</p>}
      {tasks.isError && <p className="text-ink-muted text-sm">Couldn't load your tasks.</p>}
      {tasks.isSuccess && rows.length === 0 && (
        <p className="text-ink-muted text-sm">No tasks yet.</p>
      )}

      {rows.length > 0 && (
        <ul className="flex flex-col gap-1 list-none">
          {rows.map((t) => {
            const id = `coaching-task-${t.id}`;
            return (
              <li key={t.id} className="flex items-start gap-3 rounded-md py-2">
                <Checkbox
                  id={id}
                  checked={t.done}
                  onCheckedChange={(v) => {
                    setFailed(false);
                    setDone.mutate(
                      { taskId: t.id, done: v === true },
                      { onError: () => setFailed(true) },
                    );
                  }}
                  className="mt-0.5"
                />
                <label
                  htmlFor={id}
                  className={`text-sm leading-snug cursor-pointer break-words ${
                    t.done ? "text-ink-muted line-through" : "text-ink"
                  }`}
                >
                  {t.title}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {failed && (
        <p className="text-xs text-[var(--red)]" role="alert">
          Couldn't update that task. Please try again.
        </p>
      )}
    </div>
  );
}
