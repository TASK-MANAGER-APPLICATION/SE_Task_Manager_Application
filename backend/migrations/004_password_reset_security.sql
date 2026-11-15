ALTER TABLE password_resets
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Revoke legacy outstanding records before enforcing a single active token.
UPDATE password_resets
SET used = TRUE
WHERE used = FALSE;

CREATE UNIQUE INDEX idx_password_resets_token_hash
    ON password_resets(token_hash);

CREATE UNIQUE INDEX idx_password_resets_one_active_per_user
    ON password_resets(user_id)
    WHERE used = FALSE;

CREATE INDEX idx_password_resets_expiry
    ON password_resets(expires_at);
