-- Add unlock tracking for butchers
-- unlock_limit: max number of customers who can view contact (NULL = unlimited)
-- We'll count actual unlocks from unlocked_contacts table

ALTER TABLE butchers ADD COLUMN IF NOT EXISTS unlock_limit INTEGER DEFAULT 50;

-- Create index for counting unlocks per butcher
CREATE INDEX IF NOT EXISTS idx_unlocked_contacts_butcher ON unlocked_contacts(butcher_id);
