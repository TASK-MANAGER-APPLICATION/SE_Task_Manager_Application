
ALTER TABLE sessions
ADD COLUMN token_hash TEXT;

CREATE UNIQUE INDEX idx_sessions_token_hash
ON sessions(token_hash);
