import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LESSONS, type LessonKey } from "../config";

export function CoachingDrawer({
  open,
  onOpenChange,
  lessonKey,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  lessonKey: LessonKey | null;
}) {
  const lesson = lessonKey ? LESSONS[lessonKey] : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-6 overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-xl" style={{ letterSpacing: "-0.01em" }}>
            {lesson?.title ?? "Coaching lesson"}
          </SheetTitle>
          <SheetDescription className="text-ink-muted text-sm">
            How to fix this part of your funnel.
          </SheetDescription>
        </SheetHeader>

        {!lesson || (!lesson.videoUrl && !lesson.summary && !lesson.pdfUrl) ? (
          <div className="flex flex-col gap-3 pt-2">
            <p className="text-ink text-base">Lesson coming soon</p>
            <p className="text-ink-muted text-sm max-w-prose">
              Your coach is adding this training. When it's ready, the video and
              worksheet will appear right here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {lesson.videoUrl && (
              <div className="relative w-full overflow-hidden rounded-lg border border-border bg-[var(--surface-raised)]" style={{ aspectRatio: "16 / 9" }}>
                <iframe
                  src={lesson.videoUrl}
                  title={lesson.title}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            )}
            {lesson.summary && (
              <p className="text-ink text-sm leading-relaxed max-w-prose">{lesson.summary}</p>
            )}
            {lesson.pdfUrl && (
              <a
                href={lesson.pdfUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-ink underline underline-offset-4 hover:text-[var(--red)] transition-colors text-sm w-fit"
              >
                Download the worksheet (PDF)
              </a>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
