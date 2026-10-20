import { useEffect } from "react";
import { Navigate } from "@tanstack/react-router";
import type { ToolComponentProps } from "@/tools/registry";
import { flushAllSosaSaves, useSosaAnswers } from "../data/sosaAnswers";
import { isScreeningComplete } from "../engine/rules";
import { Screening } from "./Screening";
import { Overview } from "./Overview";

/**
 * In-tool router:
 *   ""          → overview (redirects to screening until it's complete)
 *   "screening" → screening page
 */
export function SalesOperatingSystemAuditApp({ splat }: ToolComponentProps) {
  const { answers, isLoading, error } = useSosaAnswers();
  const segment = (splat || "").split("/").filter(Boolean)[0] ?? "";

  // Flush pending saves when the tab hides and when the tool unmounts.
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

  if (error) {
    return <div className="app-content py-16 text-ink-muted text-sm">Couldn't load your answers. Refresh to try again.</div>;
  }
  if (isLoading || !answers) {
    return <div className="app-content py-16 text-ink-muted text-sm">Loading…</div>;
  }

  if (segment === "screening") return <Screening />;

  if (!isScreeningComplete(answers)) {
    return (
      <Navigate
        to="/app/tools/$key/$"
        params={{ key: "sales-operating-system-audit", _splat: "screening" }}
        replace
      />
    );
  }
  return <Overview />;
}
