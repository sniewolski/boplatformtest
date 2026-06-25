import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createRespondentSession } from "@/lib/sessions.functions";

/**
 * Owner-side share UI. Mints a fresh /r/{token} link via the existing
 * createRespondentSession server function and surfaces a copyable URL.
 * Email send is intentionally out of scope.
 */
export function ShareLinkCard() {
  const createSession = useServerFn(createRespondentSession);
  const [copied, setCopied] = useState(false);

  const mint = useMutation({
    mutationFn: async () => {
      const row = await createSession({ data: { toolKey: "salescode" } });
      return row;
    },
    onSuccess: () => setCopied(false),
  });

  const url =
    mint.data && typeof window !== "undefined"
      ? `${window.location.origin}/r/${mint.data.token}`
      : null;

  const onCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — user can copy manually from the visible input.
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => mint.mutate()}
          disabled={mint.isPending}
          variant="outline"
          className="active:scale-[0.97] transition-transform inline-flex items-center gap-2"
        >
          <Link2 className="size-4" />
          {mint.isPending
            ? "Generating…"
            : url
              ? "Generate another link"
              : "Generate link"}
        </Button>
        {mint.error ? (
          <span className="text-xs text-red">
            {(mint.error as Error).message}
          </span>
        ) : null}
      </div>

      {url ? (
        <div className="flex items-stretch gap-2">
          <Input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            onClick={onCopy}
            className="inline-flex items-center gap-2 shrink-0"
          >
            {copied ? (
              <>
                <Check className="size-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="size-4" /> Copy
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
