-- Run manually if you prefer not to rely on the app's auto-migration in db.js
CREATE TABLE IF NOT EXISTS links (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(32) UNIQUE NOT NULL,
  destination_url TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_links_slug ON links (slug);
