-- Add password hash column for password-based authentication
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);

-- Add index for phone lookup (used in login)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
