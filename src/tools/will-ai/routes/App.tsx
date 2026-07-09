import type { ToolComponentProps } from "@/tools/registry";
import { WillAiChat } from "./Chat";

/**
 * In-tool router for Will AI.
 *
 * Single view for Phase 6 — the chat surface. `splat` is accepted per the
 * registry convention but currently unused; future deep links (e.g. reopen
 * a specific conversation) can slot in here.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function WillAiApp(_props: ToolComponentProps) {
  return <WillAiChat />;
}
