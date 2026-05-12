-- Add pricing type fields to butchers
-- Kosai can set price per animal OR per kg of meat

ALTER TABLE butchers
ADD COLUMN cow_price_type VARCHAR(20) DEFAULT 'PER_ANIMAL',
ADD COLUMN goat_price_type VARCHAR(20) DEFAULT 'PER_ANIMAL';

-- Rename existing price columns for clarity
COMMENT ON COLUMN butchers.cow_price IS 'Price in Taka - per animal or per kg based on cow_price_type';
COMMENT ON COLUMN butchers.goat_price IS 'Price in Taka - per animal or per kg based on goat_price_type';

-- Price types: PER_ANIMAL (fixed processing fee per animal) or PER_KG (price per kg of meat)
