-- Watchlist
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'stock',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  condition VARCHAR(10) NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  message TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat history
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  chart_context JSONB,
  tool_calls JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analysis log
CREATE TABLE IF NOT EXISTS analysis_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  analysis_type VARCHAR(50),
  ai_summary TEXT NOT NULL,
  confidence VARCHAR(10),
  price_at_analysis DECIMAL(20, 8),
  price_after_1h DECIMAL(20, 8),
  price_after_24h DECIMAL(20, 8),
  price_after_7d DECIMAL(20, 8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default watchlist
INSERT INTO watchlist (symbol, name, type) VALUES
  ('AAPL', 'Apple Inc.', 'stock'),
  ('TSLA', 'Tesla Inc.', 'stock'),
  ('GOOGL', 'Alphabet Inc.', 'stock'),
  ('USD/JPY', 'US Dollar / Japanese Yen', 'forex'),
  ('EUR/USD', 'Euro / US Dollar', 'forex'),
  ('BTC/USD', 'Bitcoin / US Dollar', 'crypto')
ON CONFLICT DO NOTHING;
