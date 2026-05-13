-- ============================================================
-- V13 — Point bKash callback at the new production domain.
-- Existing rows from V12 still hold the old IP-based URL on prod DBs;
-- this migration migrates them in place. Admins can still override via
-- PATCH /admin/settings/bkash_callback_url.
-- ============================================================

UPDATE app_settings
   SET setting_value = 'https://kosailagbe.com/payment/callback'
 WHERE setting_key = 'bkash_callback_url'
   AND setting_value IN (
       'http://103.187.22.131:3001/payment/callback',
       'http://localhost:3001/payment/callback'
   );
