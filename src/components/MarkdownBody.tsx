import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Shared markdown renderer. The default styling mirrors the Will AI chat
 * answer styling so lesson bodies and chat answers look consistent.
 * Raw HTML is not enabled (no rehype-raw), so markdown input is safe.
 */

export const MARKDOWN_BODY_CLASS =
  "text-ink text-sm leading-relaxed break-words [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:my-0.5 [&_strong]:font-semibold [&_strong]:text-ink [&_em]:italic [&_code]:rounded [&_code]:bg-[var(--surface-raised)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_a]:underline [&_a]:underline-offset-2 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-md";

export function MarkdownBody({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn(MARKDOWN_BODY_CLASS, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export default MarkdownBody;
