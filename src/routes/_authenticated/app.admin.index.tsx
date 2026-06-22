import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listOwners, provisionOwner, setAccountStatus } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/app/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const queryClient = useQueryClient();
  const list = useServerFn(listOwners);
  const provision = useServerFn(provisionOwner);
  const setStatus = useServerFn(setAccountStatus);

  const owners = useQuery({
    queryKey: ["admin", "owners"],
    queryFn: () => list({}),
  });

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

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
  });

  return (
    <div className="max-w-4xl mx-auto px-8 py-16 flex flex-col gap-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl">Admin</h1>
        <p className="text-ink-muted text-sm">
          Provision owners and manage account status.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Provision owner</h2>
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
            {provisionMut.isPending ? "Provisioning…" : "Provision owner"}
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl">Accounts</h2>
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
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={statusMut.isPending}
                    onClick={() =>
                      statusMut.mutate({
                        userId: row.id,
                        status: suspended ? "active" : "suspended",
                      })
                    }
                  >
                    {suspended ? "Reinstate" : "Suspend"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
