-- ============================================================
-- V10 — Remove duplicate thanas/districts and add UNIQUE constraints
-- Fixes UI repetition bug on /register/butcher and /home dropdowns.
-- ============================================================

-- 1. Deduplicate districts: keep lowest id for each name_en, repoint thanas
CREATE TEMP TABLE district_dedupe_map AS
SELECT id AS old_id,
       MIN(id) OVER (PARTITION BY name_en) AS new_id
FROM districts;

UPDATE thanas t
SET district_id = m.new_id
FROM district_dedupe_map m
WHERE t.district_id = m.old_id
  AND m.old_id <> m.new_id;

UPDATE customers c
SET district_id = m.new_id
FROM district_dedupe_map m
WHERE c.district_id = m.old_id
  AND m.old_id <> m.new_id;

DELETE FROM districts d
USING district_dedupe_map m
WHERE d.id = m.old_id
  AND m.old_id <> m.new_id;

-- 2. Deduplicate thanas: keep lowest id per (district_id, name_en),
--    repoint butcher_thanas and customer_thanas, then drop duplicates.
CREATE TEMP TABLE thana_dedupe_map AS
SELECT id AS old_id,
       MIN(id) OVER (PARTITION BY district_id, name_en) AS new_id
FROM thanas;

-- Migrate butcher_thanas references; ON CONFLICT skips rows already pointing to new_id
INSERT INTO butcher_thanas (butcher_id, thana_id)
SELECT DISTINCT bt.butcher_id, m.new_id
FROM butcher_thanas bt
JOIN thana_dedupe_map m ON bt.thana_id = m.old_id
WHERE m.old_id <> m.new_id
ON CONFLICT DO NOTHING;

DELETE FROM butcher_thanas bt
USING thana_dedupe_map m
WHERE bt.thana_id = m.old_id
  AND m.old_id <> m.new_id;

-- Migrate customer_thanas references
INSERT INTO customer_thanas (customer_id, thana_id)
SELECT DISTINCT ct.customer_id, m.new_id
FROM customer_thanas ct
JOIN thana_dedupe_map m ON ct.thana_id = m.old_id
WHERE m.old_id <> m.new_id
ON CONFLICT DO NOTHING;

DELETE FROM customer_thanas ct
USING thana_dedupe_map m
WHERE ct.thana_id = m.old_id
  AND m.old_id <> m.new_id;

-- Drop duplicate thanas
DELETE FROM thanas t
USING thana_dedupe_map m
WHERE t.id = m.old_id
  AND m.old_id <> m.new_id;

-- 3. Prevent future duplicates
ALTER TABLE districts
    ADD CONSTRAINT districts_name_en_uniq UNIQUE (name_en);

ALTER TABLE thanas
    ADD CONSTRAINT thanas_district_name_en_uniq UNIQUE (district_id, name_en);
