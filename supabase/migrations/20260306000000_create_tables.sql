-- Watchlist items per user
CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol     TEXT        NOT NULL,
  name       TEXT        NOT NULL,
  type       TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, symbol)
);

-- Price alerts per user
CREATE TABLE IF NOT EXISTS public.alerts (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol       TEXT        NOT NULL,
  condition    TEXT        NOT NULL,
  price        DECIMAL     NOT NULL,
  message      TEXT        DEFAULT '',
  is_active    BOOLEAN     DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  triggered_at TIMESTAMPTZ
);

-- Chat messages per user
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT        NOT NULL,
  content       TEXT        NOT NULL,
  sources       JSONB       DEFAULT '[]',
  chart_actions JSONB       DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Portfolio state per user (cash + positions + trades as JSONB for simplicity)
CREATE TABLE IF NOT EXISTS public.portfolio_state (
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  cash_jpy   DECIMAL     NOT NULL DEFAULT 1000000,
  positions  JSONB       NOT NULL DEFAULT '{}',
  trades     JSONB       NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);
