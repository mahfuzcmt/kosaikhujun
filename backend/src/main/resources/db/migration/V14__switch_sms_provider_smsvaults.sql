-- ============================================================
-- V14 — Switch SMS provider from BulkSMSBD to smsvaults.work.
-- The new endpoint uses different query parameters:
--   apikey, secretkey, callerID, toUser, messageContent
-- callerID is an 11-digit BD phone number (e.g. 01844015757),
-- not a 13-digit sender id like the BulkSMSBD one.
-- ============================================================

INSERT INTO app_settings (setting_key, setting_value, description) VALUES
    ('sms_secret_key', 'a2185de9', 'smsvaults.work secret key')
ON CONFLICT (setting_key) DO NOTHING;

UPDATE app_settings
   SET setting_value = 'http://cpanel.smsvaults.work/sendtext',
       description   = 'SMS API endpoint URL (smsvaults.work)'
 WHERE setting_key = 'sms_api_url';

UPDATE app_settings
   SET setting_value = '0ffe1d6a29e4a4d1',
       description   = 'smsvaults.work API key'
 WHERE setting_key = 'sms_api_key';

UPDATE app_settings
   SET setting_value = '01844015757',
       description   = 'SMS sender callerID (11-digit BD phone number)'
 WHERE setting_key = 'sms_sender_id';
