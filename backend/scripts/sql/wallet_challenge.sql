-- Wallet Challenge Table for Signature-Based Authorization

CREATE TABLE IF NOT EXISTS wallet_challenges (
    wallet_address VARCHAR(42) PRIMARY KEY,
    nonce TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_challenges_expires ON wallet_challenges(expires_at);

-- Clean up expired challenges periodically
-- Run this as a cron job or scheduled task
-- DELETE FROM wallet_challenges WHERE expires_at < NOW();
