import { QUESTIONS, SECTIONS, SKIP_RULES } from "../config/questionBank";

export function SalesOperatingSystemAuditApp() {
  return (
    <div className="app-content py-16 flex flex-col gap-4">
      <h1 className="text-2xl">Sales Operating System Audit</h1>
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex gap-2">
          <dt className="text-ink-muted">Sections</dt>
          <dd className="text-ink">{SECTIONS.length}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-muted">Questions</dt>
          <dd className="text-ink">{QUESTIONS.length}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-muted">Skip rules</dt>
          <dd className="text-ink">{SKIP_RULES.length}</dd>
        </div>
      </dl>
    </div>
  );
}
