-- ============================================================
-- V17 — Switch SMS provider from smsvaults.work to durbar71.com.
-- The new endpoint is a POST (application/x-www-form-urlencoded):
--   POST https://sms.durbar71.com/httpapi/sendsms
--   body: userId, password, smsText, commaSeperatedReceiverNumbers
-- Credentials are now userId/password (was apikey/secretkey) and
-- there is no sender/callerID parameter.
-- ============================================================

INSERT INTO app_settings (setting_key, setting_value, description) VALUES
    ('sms_api_url',  'https://sms.durbar71.com/httpapi/sendsms', 'SMS API endpoint URL (durbar71.com)'),
    ('sms_user_id',  'hitech3',   'durbar71.com SMS account userId'),
    ('sms_password', 'Hitech123', 'durbar71.com SMS account password')
ON CONFLICT (setting_key) DO UPDATE
   SET setting_value = EXCLUDED.setting_value,
       description   = EXCLUDED.description,
       updated_at    = now();

-- Remove obsolete smsvaults.work credential keys (apikey/secretkey/callerID).
DELETE FROM app_settings
 WHERE setting_key IN ('sms_api_key', 'sms_secret_key', 'sms_sender_id');
