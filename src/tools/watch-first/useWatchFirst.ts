import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Watch First data hooks.
 *
 * Lessons are admin-authored; RLS already hides unpublished lessons from
 * owners, so no `is_published` filter is applied here.
 */

export type WatchFirstLesson = {
  id: string;
  title: string;
  video_embed_url: string | null;
  body_markdown: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type WatchFirstProgress = {
  id: string;
  owner_id: string;
  lesson_id: string;
  watched_at: string;
};

const LESSONS_KEY = ["watch-first", "lessons"] as const;
const PROGRESS_KEY = ["watch-first", "progress"] as const;

export function useWatchFirstLessons() {
  return useQuery({
    queryKey: LESSONS_KEY,
    queryFn: async (): Promise<WatchFirstLesson[]> => {
      const { data, error } = await supabase
        .from("watch_first_lessons")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as WatchFirstLesson[];
    },
  });
}

export function useWatchFirstProgress() {
  return useQuery({
    queryKey: PROGRESS_KEY,
    queryFn: async (): Promise<WatchFirstProgress[]> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from("watch_first_lesson_progress")
        .select("*")
        .eq("owner_id", uid);
      if (error) throw error;
      return (data ?? []) as WatchFirstProgress[];
    },
  });
}

export function useMarkLessonWatched() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const { error } = await supabase
        .from("watch_first_lesson_progress")
        .upsert(
          { owner_id: uid, lesson_id: lessonId },
          { onConflict: "owner_id,lesson_id", ignoreDuplicates: true },
        );
      if (error) throw error;
      return lessonId;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PROGRESS_KEY }),
  });
}
