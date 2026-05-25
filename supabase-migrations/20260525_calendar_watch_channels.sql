-- Estado dos push notification channels do Google Calendar.
-- Cada calendário organizador (consultor@, especialistablackcrm@) tem um channel ativo.
-- A edge watchdog-gcal renova antes da expiração; a webhook-gcal atualiza last_notification_at.

CREATE TABLE IF NOT EXISTS calendar_watch_channels (
  calendar_email text PRIMARY KEY,
  channel_id text NOT NULL,
  resource_id text NOT NULL,
  sync_token text,
  expiration timestamptz NOT NULL,
  last_notification_at timestamptz,
  last_renewed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendar_watch_channels_channel_id_idx
  ON calendar_watch_channels (channel_id);

-- updated_at automático
CREATE OR REPLACE FUNCTION calendar_watch_channels_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calendar_watch_channels_updated_at ON calendar_watch_channels;
CREATE TRIGGER trg_calendar_watch_channels_updated_at
  BEFORE UPDATE ON calendar_watch_channels
  FOR EACH ROW EXECUTE FUNCTION calendar_watch_channels_set_updated_at();
