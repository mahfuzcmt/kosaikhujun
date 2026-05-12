-- ============================================================
-- V11 — Normalize butcher photo_url to relative paths
-- Old rows stored absolute URLs that broke when the host/IP changed.
-- New uploads store "/uploads/<filename>"; this rewrites legacy rows
-- to that same shape so the frontend resolver works uniformly.
-- ============================================================

UPDATE butchers
SET photo_url = SUBSTRING(photo_url FROM POSITION('/uploads/' IN photo_url))
WHERE photo_url IS NOT NULL
  AND photo_url LIKE 'http%'
  AND POSITION('/uploads/' IN photo_url) > 0;
