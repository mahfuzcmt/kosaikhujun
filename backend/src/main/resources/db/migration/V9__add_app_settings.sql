-- App settings table for SMS configuration and other settings
CREATE TABLE app_settings (
    id              SERIAL PRIMARY KEY,
    setting_key     VARCHAR(100) UNIQUE NOT NULL,
    setting_value   TEXT,
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Insert default SMS settings
INSERT INTO app_settings (setting_key, setting_value, description) VALUES
('sms_dev_mode', 'true', 'SMS dev mode - if true, SMS will be logged but not sent'),
('sms_api_key', '', 'BulkSMSBD API key'),
('sms_sender_id', '8809617642636', 'SMS sender ID'),
('sms_api_url', 'http://bulksmsbd.net/api/smsapi', 'SMS API endpoint URL');

-- Create index for faster lookups
CREATE INDEX idx_app_settings_key ON app_settings(setting_key);
