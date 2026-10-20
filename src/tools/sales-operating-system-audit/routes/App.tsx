import { useEffect } from "react";
import { Navigate } from "@tanstack/react-router";
import type { ToolComponentProps } from "@/tools/registry";
import { flushAllSosaSaves, useSosaAnswers } from "../data/sosaAnswers";
import { getSectionProgress, getVisibleSections, isScreeningComplete } from "../engine/rules";
import { AuditLayout } from "../components/AuditLayout";
import { Screening } from "./Screening";
import { SectionPage } from "./SectionPage";

const KEY = "sales-operating-system-audit";

function Go({ to }: { to: string }) {
  return <Navigate to="/app/tools/$key/$" params={{ key: KEY, _splat: to }} replace />;
}

/**
 * In-tool router:
 *   ""           → landing: screening until complete, else first incomplete visible section
 *   "screening"  → screening page
 *   "section/:n" → section page (redirects to landing if hidden)
 */
export function SalesOperatingSystemAuditApp({ splat }: ToolComponentProps) {
  const { answers, isLoading, error } = useSosaAnswers();
  const parts = (splat || "").split("/").filter(Boolean);
  const segment = parts[0] ?? "";

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") flushAllSosaSaves();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      flushAllSosaSaves();
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [splat]);

  if (error) {
    return <div className="app-content py-16 text-ink-muted text-sm">Couldn't load your answers. Refresh to try again.</div>;
  }
  if (isLoading || !answers) {
    return <div className="app-content py-16 text-ink-muted text-sm">Loading…</div>;
  }

  if (segment === "screening") {
    return (
      <AuditLayout current="screening">
        <Screening />
      </AuditLayout>
    );
  }

  if (segment === "section") {
    const n = Number(parts[1]);
    if (!getVisibleSections(answers).some((s) => s.number === n)) return <Go to="" />;
    return (
      <AuditLayout current={n}>
        <SectionPage key={n} number={n} />
      </AuditLayout>
    );
  }

  if (!isScreeningComplete(answers)) return <Go to="screening" />;
  const visible = getVisibleSections(answers);
  const target =
    visible.find((s) => {
      const p = getSectionProgress(s.number, answers);
      return p.answered < p.total;
    }) ?? visible[0];
  return <Go to={target ? `section/${target.number}` : "screening"} />;
}
