import { useState } from "react";
import { useMyRoles } from "@/core/roles/useMyRoles";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteUser,
  listOwners,
  provisionOwner,
  setAccountStatus,
  setAdminRole,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_authenticated/app/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();
  const { data: roles, isLoading: rolesLoading } = useMyRoles(user.id);
  const list = useServerFn(listOwners);
  const provision = useServerFn(provisionOwner);
  const setStatus = useServerFn(setAccountStatus);
  const setAdmin = useServerFn(setAdminRole);
  const del = useServerFn(deleteUser);

  if (rolesLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-ink-muted text-sm">Loading…</p>
      </div>
    );
  }
  if (!roles?.includes("admin")) {
    return (
      <div className="max-w-md mx-auto px-8 py-16 text-center flex flex-col gap-3">
        <h1 className="text-2xl">Not authorised</h1>
        <p className="text-ink-muted text-sm">
          You don't have access to the admin area.
        </p>
      </div>
    );
  }

  const owners = useQuery({
    queryKey: ["admin", "owners"],
    queryFn: () => list(),
  });

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const provisionMut = useMutation({
    mutationFn: (vars: { email: string; fullName?: string }) =>
      provision({ data: vars }),
    onSuccess: () => {
      setEmail("");
      setFullName("");
      setFeedback("Owner provisioned.");
      queryClient.invalidateQueries({ queryKey: ["admin", "owners"] });
    },
    onError: (err: Error) => setFeedback(err.message),
  });

  const statusMut = useMutation({
    mutationFn: (vars: { userId: string; status: "active" | "suspended" }) =>
      setStatus({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "owners"] });
    },
    onError: (err: Error) => setFeedback(err.message),
  });

  const adminMut = useMutation({
    mutationFn: (vars: { userId: string; grant: boolean }) =>
      setAdmin({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "owners"] });
    },
    onError: (err: Error) => setFeedback(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (vars: { userId: string }) => del({ data: vars }),
    onSuccess: () => {
      setDeleteTarget(null);
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "owners"] });
    },
    onError: (err: Error) => setDeleteError(err.message),
  });

  return (
    <div className="app-content py-16 flex flex-col gap-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Admin</h1>
        <p className="text-ink-muted text-sm">
          Add users and manage account access.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Add user</h2>
        <form
          className="flex flex-col gap-4 max-w-md"
          onSubmit={(e) => {
            e.preventDefault();
            setFeedback(null);
            provisionMut.mutate({
              email: email.trim(),
              fullName: fullName.trim() || undefined,
            });
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="prov-email">Email</Label>
            <Input
              id="prov-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="prov-name">Full name (optional)</Label>
            <Input
              id="prov-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          {feedback && <p className="text-sm text-ink-muted">{feedback}</p>}
          <Button type="submit" disabled={provisionMut.isPending || !email}>
            {provisionMut.isPending ? "Adding…" : "Add user"}
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Accounts</h2>
        <p className="text-ink-muted text-sm">
          Grant admin to let someone else review submitted content.
        </p>
        {owners.isLoading && (
          <p className="text-ink-muted text-sm">Loading…</p>
        )}
        {owners.error && (
          <p className="text-sm text-[var(--red)]">
            {(owners.error as Error).message}
          </p>
        )}
        {owners.data && owners.data.length === 0 && (
          <p className="text-ink-muted text-sm">No accounts yet.</p>
        )}
        {owners.data && owners.data.length > 0 && (
          <ul className="flex flex-col divide-y divide-border border border-border rounded-xl">
            {owners.data.map((row) => {
              const suspended = row.accountStatus === "suspended";
              const isAdmin = row.roles.includes("admin");
              const isSelf = row.id === user.id;
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between px-5 py-4 gap-4"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-ink text-sm truncate">{row.email}</span>
                    <span className="text-ink-muted text-xs truncate">
                      {row.fullName ?? "—"} · {row.roles.join(", ") || "no role"} ·{" "}
                      <span className={suspended ? "text-[var(--red)]" : ""}>
                        {row.accountStatus}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={adminMut.isPending || isSelf}
                      title={isSelf ? "You can't change your own admin role." : undefined}
                      onClick={() => {
                        setFeedback(null);
                        if (isAdmin && !confirm(`Revoke admin from ${row.email}?`)) return;
                        adminMut.mutate({ userId: row.id, grant: !isAdmin });
                      }}
                    >
                      {isAdmin ? "Revoke admin" : "Make admin"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={statusMut.isPending || isSelf}
                      title={isSelf ? "You can't suspend your own account." : undefined}
                      onClick={() =>
                        statusMut.mutate({
                          userId: row.id,
                          status: suspended ? "active" : "suspended",
                        })
                      }
                    >
                      {suspended ? "Reinstate" : "Suspend"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSelf}
                      title={isSelf ? "You can't delete your own account." : undefined}
                      className="text-[var(--red)] hover:text-[var(--red)]"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget({ id: row.id, email: row.email });
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the user and all of their data — audit
              submissions, SalesCode results, and any assessments they sent.
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-sm text-[var(--red)]">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMut.isPending || !deleteTarget}
              onClick={(e) => {
                e.preventDefault();
                if (!deleteTarget) return;
                deleteMut.mutate({ userId: deleteTarget.id });
              }}
              className="bg-[var(--red)] text-white hover:bg-[var(--red)]/90"
            >
              {deleteMut.isPending ? "Deleting…" : "Delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
