-- ============================================================
-- V18 — Allow decimal values for butcher prices.
-- cow_price/goat_price were INTEGER, which cannot store
-- percentage pricing like 13.5 (cow_price_type = 'PERCENTAGE').
-- Widen to NUMERIC(10,2) — works for per-animal/per-kg taka
-- amounts and fractional percentages alike.
-- ============================================================

ALTER TABLE butchers
    ALTER COLUMN cow_price  TYPE NUMERIC(10,2) USING cow_price::numeric(10,2),
    ALTER COLUMN goat_price TYPE NUMERIC(10,2) USING goat_price::numeric(10,2);
