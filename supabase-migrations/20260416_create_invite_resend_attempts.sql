CREATE TABLE IF NOT EXISTS invite_resend_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invite_resend_attempts_email_created_idx
  ON invite_resend_attempts (email, created_at DESC);
