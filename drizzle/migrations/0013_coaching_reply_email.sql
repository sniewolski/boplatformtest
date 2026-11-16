-- One row per owner: the 15-minute coaching-email throttle plus a one-shot
-- claim the app server must consume before it queues the email.
CREATE TABLE public.coaching_notifications (
  owner_id uuid PRIMARY KEY,
  last_notified_at timestamptz NOT NULL,
  last_message_id uuid NOT NULL,
  email_queued_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coaching_notifications TO authenticated;
GRANT ALL ON public.coaching_notifications TO service_role;

ALTER TABLE public.coaching_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read coaching notifications"
  ON public.coaching_notifications
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- After a staff message lands in an owner's thread: skip suspended owners,
-- claim the 15-minute slot atomically, then ping the app server (pg_net, sent
-- after commit). The server only queues an email for the message that holds
-- the unconsumed claim, so the ping carries no secret.
-- Never blocks or fails the message insert.
CREATE OR REPLACE FUNCTION public.coaching_notify_owner_of_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_claimed uuid;
BEGIN
  IF NEW.sender_id = NEW.owner_id THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.owner_id
      AND p.account_status <> 'suspended'
      AND coalesce(p.email, '') <> ''
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.coaching_notifications AS cn
    (owner_id, last_notified_at, last_message_id, email_queued_at, updated_at)
  VALUES (NEW.owner_id, now(), NEW.id, NULL, now())
  ON CONFLICT (owner_id) DO UPDATE
    SET last_notified_at = now(),
        last_message_id = NEW.id,
        email_queued_at = NULL,
        updated_at = now()
    WHERE cn.last_notified_at <= now() - interval '15 minutes'
  RETURNING cn.owner_id INTO v_claimed;

  IF v_claimed IS NULL THEN
    RETURN NULL; -- already emailed within the last 15 minutes
  END IF;

  PERFORM net.http_post(
    url := 'https://project--d6bc2cee-66be-4752-a74b-5adb8d12ce04.lovable.app/lovable/email/coaching/reply-notify',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('messageId', NEW.id)
  );

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'coaching_notify_owner_of_reply failed (message kept): %', SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.coaching_notify_owner_of_reply() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER coaching_messages_notify_owner
  AFTER INSERT ON public.coaching_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.coaching_notify_owner_of_reply();