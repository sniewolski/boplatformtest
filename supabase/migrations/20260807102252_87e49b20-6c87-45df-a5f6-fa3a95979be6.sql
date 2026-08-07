ALTER TABLE public.business_briefs
  ADD COLUMN goal_amount numeric NULL,
  ADD COLUMN goal_period text NULL,
  ADD COLUMN goal_by date NULL,
  ADD COLUMN goal_notes text NOT NULL DEFAULT '';

ALTER TABLE public.business_briefs
  ADD CONSTRAINT business_briefs_goal_period_check
  CHECK (goal_period IN ('per_month','per_year'));