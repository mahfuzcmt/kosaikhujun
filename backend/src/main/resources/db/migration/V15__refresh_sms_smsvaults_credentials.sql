-- ============================================================
-- V15 — Force-refresh SMS provider credentials (smsvaults.work).
-- V14 used ON CONFLICT DO NOTHING for the secret key and only
-- conditional UPDATEs for the other keys; if any row was missing
-- or had drifted on a prod DB, those values stayed wrong.
-- This migration unconditionally re-sets every smsvaults setting
-- to the current authoritative values.
-- ============================================================

INSERT INTO app_settings (setting_key, setting_value, description) VALUES
    ('sms_api_url',    'http://cpanel.smsvaults.work/sendtext', 'SMS API endpoint URL (smsvaults.work)'),
    ('sms_api_key',    '0ffe1d6a29e4a4d1',                     'smsvaults.work API key'),
    ('sms_secret_key', 'a2185de9',                             'smsvaults.work secret key'),
    ('sms_sender_id',  '01844015757',                          'SMS sender callerID (11-digit BD phone number)')
ON CONFLICT (setting_key) DO UPDATE
   SET setting_value = EXCLUDED.setting_value,
       description   = EXCLUDED.description,
       updated_at    = now();
