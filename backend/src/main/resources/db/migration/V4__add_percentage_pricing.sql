-- Add PERCENTAGE as a valid price type
ALTER TABLE butchers DROP CONSTRAINT IF EXISTS butchers_cow_price_type_check;
ALTER TABLE butchers DROP CONSTRAINT IF EXISTS butchers_goat_price_type_check;

ALTER TABLE butchers ADD CONSTRAINT butchers_cow_price_type_check
  CHECK (cow_price_type IN ('PER_ANIMAL', 'PER_KG', 'PERCENTAGE'));

ALTER TABLE butchers ADD CONSTRAINT butchers_goat_price_type_check
  CHECK (goat_price_type IN ('PER_ANIMAL', 'PER_KG', 'PERCENTAGE'));
