import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCoachingTasks,
  useSetCoachingTaskDone,
  type CoachingTask,
} from "../data/coaching";
import {
  useAddCoachingTask,
  useDeleteCoachingTask,
  useRenameCoachingTask,
} from "../data/coachingAdmin";
import type { CoachingViewer } from "./CoachingChat";

export function CoachingTasks({
  ownerId,
  viewerId,
  viewer,
}: {
  ownerId: string | null;
  viewerId: string | null;
  viewer: CoachingViewer;
}) {
  const tasks = useCoachingTasks(ownerId);
  const rows = tasks.data ?? [];
  const isAdminView = viewer === "admin";

  return (
    <div className="flex flex-col gap-4 px-4 sm:px-6 py-6">
      <h2 className="text-lg font-medium text-ink" style={{ letterSpacing: "-0.01em" }}>
        {isAdminView ? "Tasks" : "Your tasks"}
      </h2>

      {isAdminView && ownerId && <AddTaskForm ownerId={ownerId} adminId={viewerId} />}

      {tasks.isLoading && <p className="text-ink-muted text-sm">Loading tasks…</p>}
      {tasks.isError && <p className="text-ink-muted text-sm">Couldn't load the tasks.</p>}
      {tasks.isSuccess && rows.length === 0 && (
        <p className="text-ink-muted text-sm">No tasks yet.</p>
      )}

      {rows.length > 0 &&
        (isAdminView && ownerId ? (
          <AdminTaskList ownerId={ownerId} rows={rows} />
        ) : (
          <OwnerTaskList ownerId={ownerId} rows={rows} />
        ))}
    </div>
  );
}

// -------------------- owner: tick / untick --------------------

function OwnerTaskList({ ownerId, rows }: { ownerId: string | null; rows: CoachingTask[] }) {
  const setDone = useSetCoachingTaskDone(ownerId);
  const [failed, setFailed] = useState(false);
  return (
    <>
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
      {failed && (
        <p className="text-xs text-[var(--red)]" role="alert">
          Couldn't update that task. Please try again.
        </p>
      )}
    </>
  );
}

// -------------------- admin: add / edit / delete --------------------

function AddTaskForm({ ownerId, adminId }: { ownerId: string; adminId: string | null }) {
  const add = useAddCoachingTask(ownerId, adminId);
  const [title, setTitle] = useState("");
  const trimmed = title.trim();
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!trimmed || add.isPending) return;
        add.mutate(trimmed, { onSuccess: () => setTitle("") });
      }}
    >
      <div className="flex items-center gap-2">
        <label htmlFor="coaching-new-task" className="sr-only">
          New task
        </label>
        <Input
          id="coaching-new-task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          className="bg-background"
        />
        <Button type="submit" size="sm" disabled={!trimmed || add.isPending}>
          Add
        </Button>
      </div>
      {add.isError && (
        <p className="text-xs text-[var(--red)]" role="alert">
          Couldn't add that task. Please try again.
        </p>
      )}
    </form>
  );
}

function AdminTaskList({ ownerId, rows }: { ownerId: string; rows: CoachingTask[] }) {
  const rename = useRenameCoachingTask(ownerId);
  const remove = useDeleteCoachingTask(ownerId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CoachingTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startEdit = (t: CoachingTask) => {
    setError(null);
    setEditingId(t.id);
    setEditValue(t.title);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };
  const saveEdit = (t: CoachingTask) => {
    const title = editValue.trim();
    if (!title) return;
    if (title === t.title) return cancelEdit();
    rename.mutate(
      { taskId: t.id, title },
      {
        onSuccess: cancelEdit,
        onError: () => setError("Couldn't save that task. Please try again."),
      },
    );
  };

  return (
    <>
      <ul className="flex flex-col gap-1 list-none">
        {rows.map((t) => {
          const editing = editingId === t.id;
          return (
            <li key={t.id} className="group flex items-start gap-3 rounded-md py-2">
              <Checkbox
                checked={t.done}
                disabled
                aria-label={t.done ? "Done" : "Not done"}
                className="mt-0.5 disabled:cursor-default"
              />
              {editing ? (
                <div className="flex-1 min-w-0 flex items-center gap-1">
                  <label htmlFor={`coaching-edit-${t.id}`} className="sr-only">
                    Task title
                  </label>
                  <Input
                    id={`coaching-edit-${t.id}`}
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveEdit(t);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancelEdit();
                      }
                    }}
                    className="h-8 bg-background"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 hover:bg-background"
                    aria-label="Save task"
                    disabled={!editValue.trim() || rename.isPending}
                    onClick={() => saveEdit(t)}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 hover:bg-background"
                    aria-label="Cancel editing"
                    onClick={cancelEdit}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span
                    className={`flex-1 min-w-0 text-sm leading-snug break-words ${
                      t.done ? "text-ink-muted line-through" : "text-ink"
                    }`}
                  >
                    {t.title}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0 -mt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-ink-muted hover:text-ink hover:bg-background"
                      aria-label={`Edit "${t.title}"`}
                      onClick={() => startEdit(t)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-ink-muted hover:text-[var(--red)] hover:bg-background"
                      aria-label={`Delete "${t.title}"`}
                      onClick={() => {
                        setError(null);
                        setDeleteTarget(t);
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="text-xs text-[var(--red)]" role="alert">
          {error}
        </p>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.title}" will be removed from this owner's list. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending || !deleteTarget}
              onClick={(e) => {
                e.preventDefault();
                if (!deleteTarget) return;
                remove.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                  onError: () => {
                    setDeleteTarget(null);
                    setError("Couldn't delete that task. Please try again.");
                  },
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {remove.isPending ? "Deleting…" : "Delete task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
