CREATE TABLE events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  time    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level   TEXT        NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR')),
  message TEXT        NOT NULL
);
