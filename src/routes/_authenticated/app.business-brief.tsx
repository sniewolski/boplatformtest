import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useBusinessBrief,
  useSaveBusinessBrief,
} from "@/core/business-brief/useBusinessBrief";
import { BUSINESS_BRIEF_FIELD_MAX } from "@/core/business-brief/businessBrief.functions";

export const Route = createFileRoute("/_authenticated/app/business-brief")({
  component: BusinessBriefPage,
});

const AUTOSAVE_MS = 700;

type Fields = {
  business_name: string;
  website: string;
  your_offer: string;
  average_deal_size: string;
  ideal_client: string;
  how_you_sell: string;
  whos_selling: string;
  sales_cycle: string;
};

const EMPTY: Fields = {
  business_name: "",
  website: "",
  your_offer: "",
  average_deal_size: "",
  ideal_client: "",
  how_you_sell: "",
  whos_selling: "",
  sales_cycle: "",
};

function BusinessBriefPage() {
  const { data: brief, isLoading } = useBusinessBrief();
  const save = useSaveBusinessBrief();

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  useEffect(() => {
    if (hydrated || isLoading || !brief) return;
    setFields({
      business_name: brief.business_name ?? "",
      website: brief.website ?? "",
      your_offer: brief.your_offer ?? "",
      average_deal_size: brief.average_deal_size ?? "",
      ideal_client: brief.ideal_client ?? "",
      how_you_sell: brief.how_you_sell ?? "",
      whos_selling: brief.whos_selling ?? "",
      sales_cycle: brief.sales_cycle ?? "",
    });
    setHydrated(true);
  }, [brief, isLoading, hydrated]);

  const currentDraft = useMemo(() => fields, [fields]);

  const lastSavedRef = useRef<string | null>(null);
  const latestDraftRef = useRef<Fields>(currentDraft);
  const dirtyRef = useRef(false);
  const saveMutateRef = useRef(save.mutate);

  useEffect(() => {
    latestDraftRef.current = currentDraft;
  }, [currentDraft]);
  useEffect(() => {
    saveMutateRef.current = save.mutate;
  }, [save.mutate]);

  const flushSave = useCallback(() => {
    if (!dirtyRef.current) return;
    const draft = latestDraftRef.current;
    const serialized = JSON.stringify(draft);
    dirtyRef.current = false;
    lastSavedRef.current = serialized;
    setSaveState("saving");
    saveMutateRef.current(draft, {
      onSuccess: () => setSaveState("saved"),
      onError: () => {
        dirtyRef.current = true;
        setSaveState("idle");
      },
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const serialized = JSON.stringify(currentDraft);
    if (lastSavedRef.current === null) {
      lastSavedRef.current = serialized;
      return;
    }
    if (lastSavedRef.current === serialized) return;
    dirtyRef.current = true;
    setSaveState("saving");
    const t = setTimeout(() => flushSave(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [currentDraft, hydrated, flushSave]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") flushSave();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      flushSave();
    };
  }, [flushSave]);

  const setField = (k: keyof Fields) => (v: string) =>
    setFields((prev) => ({ ...prev, [k]: v.slice(0, BUSINESS_BRIEF_FIELD_MAX) }));

  return (
    <div className="app-content py-12 flex flex-col gap-10 max-w-3xl">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl" style={{ letterSpacing: "-0.02em" }}>
          Business Brief
        </h1>
        <p className="text-ink-muted text-sm">
          A short profile of your business — the more you fill in, the better
          Will AI can tailor its answers to you.
        </p>
      </header>

      {isLoading ? (
        <p className="text-ink-muted text-sm">Loading…</p>
      ) : (
        <>
          <section className="flex flex-col gap-6">
            <BriefField
              label="Business Name"
              value={fields.business_name}
              onChange={setField("business_name")}
              placeholder="e.g. Apex Home Services Ltd"
            />
            <BriefField
              label="Website"
              value={fields.website}
              onChange={setField("website")}
              placeholder="e.g. apexhome.co.uk"
            />
          </section>

          <section className="flex flex-col gap-6">
            <BriefField
              label="Your Offer"
              value={fields.your_offer}
              onChange={setField("your_offer")}
              placeholder="e.g. 6-week done-with-you sales coaching for home-service business owners"
              multiline
            />
            <BriefField
              label="Average Deal Size"
              value={fields.average_deal_size}
              onChange={setField("average_deal_size")}
              placeholder="e.g. £4,000 per client, or £500–£2,000 depending on the package"
            />
            <BriefField
              label="Your Ideal Client (ICP)"
              helper="Your ideal customer profile."
              value={fields.ideal_client}
              onChange={setField("ideal_client")}
              placeholder="e.g. B2B, home-service contractors, £1–5m turnover, decision-maker is the owner"
              multiline
            />
            <BriefField
              label="How You Sell"
              value={fields.how_you_sell}
              onChange={setField("how_you_sell")}
              placeholder="e.g. mostly inbound referrals plus some LinkedIn outbound; deals close on a booked call"
              multiline
            />
            <BriefField
              label="Who's Selling"
              value={fields.whos_selling}
              onChange={setField("whos_selling")}
              placeholder="e.g. just me — or me plus two salespeople"
            />
            <BriefField
              label="Sales Cycle"
              value={fields.sales_cycle}
              onChange={setField("sales_cycle")}
              placeholder="e.g. one call to close, or 3–4 conversations over about a month"
              multiline
            />
          </section>

          <SavedIndicator
            state={saveState}
            updatedAt={brief?.updated_at ?? null}
          />
        </>
      )}
    </div>
  );
}

function BriefField({
  label,
  helper,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  helper?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm text-ink">{label}</Label>
      {helper && <p className="text-xs text-ink-muted">{helper}</p>}
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          maxLength={BUSINESS_BRIEF_FIELD_MAX}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={BUSINESS_BRIEF_FIELD_MAX}
        />
      )}
    </div>
  );
}

function SavedIndicator({
  state,
  updatedAt,
}: {
  state: "idle" | "saving" | "saved";
  updatedAt: string | null;
}) {
  const label =
    state === "saving"
      ? "Saving…"
      : state === "saved"
        ? "Saved"
        : updatedAt
          ? `Last saved ${new Date(updatedAt).toLocaleString()}`
          : "";
  if (!label) return null;
  return (
    <p className="text-xs text-ink-muted" aria-live="polite">
      {label}
    </p>
  );
}
