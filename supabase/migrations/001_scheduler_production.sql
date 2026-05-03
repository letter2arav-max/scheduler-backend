-- Idempotent schema for scheduler-backend. Run in Supabase SQL editor.
-- If you already have tables, review CHECK constraints and duplicate phones before running.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  phone text,
  wake_time text,
  sleep_time text,
  last_workout_date date,
  fatigue_level integer NOT NULL DEFAULT 3,
  sleep_hours double precision NOT NULL DEFAULT 7
);

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wake_time text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sleep_time text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_workout_date date;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fatigue_level integer;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sleep_hours double precision;

ALTER TABLE public.users ALTER COLUMN fatigue_level SET DEFAULT 3;
ALTER TABLE public.users ALTER COLUMN sleep_hours SET DEFAULT 7;

DO $$
BEGIN
  ALTER TABLE public.users
    ADD CONSTRAINT users_fatigue_level_range
    CHECK (fatigue_level >= 1 AND fatigue_level <= 5);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.users
    ADD CONSTRAINT users_sleep_hours_nonnegative
    CHECK (sleep_hours >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON public.users (phone);

CREATE TABLE IF NOT EXISTS public.scheduler_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message text NOT NULL,
  status text NOT NULL,
  decision_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduler_logs ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.scheduler_logs ADD COLUMN IF NOT EXISTS message text;
ALTER TABLE public.scheduler_logs ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.scheduler_logs ADD COLUMN IF NOT EXISTS decision_type text;
ALTER TABLE public.scheduler_logs ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE public.scheduler_logs ALTER COLUMN created_at SET DEFAULT now();

DO $$
BEGIN
  ALTER TABLE public.scheduler_logs
    ADD CONSTRAINT scheduler_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.scheduler_logs
    ADD CONSTRAINT scheduler_logs_status_check
    CHECK (status IN ('sent', 'done', 'skipped', 'failed'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_scheduler_logs_user_created
  ON public.scheduler_logs (user_id, created_at DESC);
