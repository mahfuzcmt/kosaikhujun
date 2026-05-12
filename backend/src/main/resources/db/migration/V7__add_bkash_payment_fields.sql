-- Add bKash payment tracking fields
ALTER TABLE payments ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES packages(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bkash_payment_id VARCHAR(100);

-- Create index for bkash_payment_id lookup
CREATE INDEX IF NOT EXISTS idx_payments_bkash_id ON payments(bkash_payment_id);
