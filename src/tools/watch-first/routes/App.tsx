import { useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { ToolComponentProps } from "@/tools/registry";
import { Button } from "@/components/ui/button";
import { MarkdownBody } from "@/components/MarkdownBody";
import { resolveWistiaEmbed } from "../wistia";
import { cn } from "@/lib/utils";
import {
  useMarkLessonWatched,
  useWatchFirstLessons,
  useWatchFirstProgress,
  type WatchFirstLesson,
} from "../useWatchFirst";

/**
 * In-tool router for Watch First.
 *
 *   ""            → first unwatched lesson (or the first lesson if all done)
 *   "<lessonId>"  → that lesson
 */
export function WatchFirstApp({ splat }: ToolComponentProps) {
  const segment = (splat || "").split("/")[0] ?? "";
  const lessonsQuery = useWatchFirstLessons();
  const progressQuery = useWatchFirstProgress();
  const markWatched = useMarkLessonWatched();
  const navigate = useNavigate();

  const lessons = useMemo(
    () => lessonsQuery.data ?? [],
    [lessonsQuery.data],
  );
  const watchedIds = useMemo(
    () => new Set((progressQuery.data ?? []).map((p) => p.lesson_id)),
    [progressQuery.data],
  );

  const loading = lessonsQuery.isLoading || progressQuery.isLoading;

  const current: WatchFirstLesson | undefined = useMemo(() => {
    if (lessons.length === 0) return undefined;
    if (segment) return lessons.find((l) => l.id === segment) ?? lessons[0];
    return lessons.find((l) => !watchedIds.has(l.id)) ?? lessons[0];
  }, [lessons, segment, watchedIds]);

  if (loading) {
    return (
      <div className="app-content py-16">
        <p className="text-ink-muted text-sm">Loading…</p>
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <div className="app-content py-16 flex flex-col gap-3">
        <h1 className="text-ink text-xl font-semibold">Watch First</h1>
        <p className="text-ink-muted text-sm max-w-prose">
          There are no lessons yet. Your coach is putting them together — check
          back shortly.
        </p>
      </div>
    );
  }

  const index = current ? lessons.findIndex((l) => l.id === current.id) : 0;
  const lesson = current!;
  const isWatched = watchedIds.has(lesson.id);
  const isFirst = index === 0;
  const isLast = index === lessons.length - 1;
  const watchedCount = lessons.filter((l) => watchedIds.has(l.id)).length;
  const pct = Math.round((watchedCount / lessons.length) * 100);

  function goTo(id: string) {
    void navigate({
      to: "/app/tools/$key/$",
      params: { key: "watch-first", _splat: id },
    });
  }

  async function handlePrimary() {
    if (!isWatched) {
      try {
        await markWatched.mutateAsync(lesson.id);
      } catch {
        /* progress failures shouldn't block navigation */
      }
    }
    if (!isLast) goTo(lessons[index + 1]!.id);
  }

  return (
    <div className="app-content py-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      {/* ---------------- left rail ---------------- */}
      <aside className="w-full lg:w-[280px] lg:shrink-0 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-ink text-base font-semibold">Watch First</h1>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]"
            role="progressbar"
            aria-valuenow={watchedCount}
            aria-valuemin={0}
            aria-valuemax={lessons.length}
          >
            <div
              className="h-full rounded-full bg-ink motion-safe:transition-[width] motion-safe:duration-200"
              style={{ width: `${pct}%`, transitionTimingFunction: "var(--ease-out)" }}
            />
          </div>
          <p className="text-ink-muted text-xs">
            {watchedCount} of {lessons.length} watched
          </p>
        </div>

        <nav className="rounded-xl border border-border overflow-hidden">
          <ul className="divide-y divide-border">
            {lessons.map((l) => {
              const active = l.id === lesson.id;
              const done = watchedIds.has(l.id);
              return (
                <li key={l.id}>
                  <Link
                    to="/app/tools/$key/$"
                    params={{ key: "watch-first", _splat: l.id }}
                    className={cn(
                      "flex items-start gap-2.5 px-4 py-3 text-sm motion-safe:transition-colors motion-safe:duration-150",
                      active
                        ? "bg-[var(--surface-raised)] text-ink font-medium"
                        : "text-ink-muted hover:bg-[var(--surface-raised)] hover:text-ink",
                    )}
                    style={{ transitionTimingFunction: "var(--ease-out)" }}
                  >
                    <span className="mt-0.5 size-4 shrink-0">
                      {done && <Check className="size-4 text-ink" aria-label="Watched" />}
                    </span>
                    <span className="min-w-0 break-words">{l.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* ---------------- main column ---------------- */}
      <section className="min-w-0 flex-1 flex flex-col gap-6">
        <h2 className="text-ink text-xl font-semibold">{lesson.title}</h2>

        {(() => {
          const videoSrc = resolveWistiaEmbed(lesson.video_embed_url ?? "");
          if (!videoSrc) return null;
          return (
            <div
              className="relative w-full overflow-hidden rounded-lg border border-border bg-[var(--surface-raised)]"
              style={{ aspectRatio: "16 / 9" }}
            >
              <iframe
                src={videoSrc}
                title={lesson.title}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          );
        })()}

        {lesson.body_markdown && (
          <MarkdownBody>{lesson.body_markdown}</MarkdownBody>
        )}

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-5">
          <Button
            variant="outline"
            disabled={isFirst}
            onClick={() => {
              if (!isFirst) goTo(lessons[index - 1]!.id);
            }}
          >
            <ArrowLeft className="size-4" />
            Previous
          </Button>
          <Button
            onClick={() => void handlePrimary()}
            disabled={markWatched.isPending}
          >
            {isWatched ? "Next" : "Mark as watched & continue"}
            {!isLast && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </section>
    </div>
  );
}
