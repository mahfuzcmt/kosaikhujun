-- ============================================================
-- V12 — Move bKash merchant credentials into app_settings.
-- Backend now reads bKash config from this table instead of @Value/env.
-- Defaults below are the sandbox values previously hard-coded;
-- admins update them via PATCH /admin/settings/{key} or POST /admin/settings/bkash.
-- ============================================================

INSERT INTO app_settings (setting_key, setting_value, description) VALUES
    ('bkash_base_url',     'https://tokenized.sandbox.bka.sh/v1.2.0-beta', 'bKash API base URL (sandbox or production)'),
    ('bkash_app_key',      '0vWQuCRGiUX7EPVjQDr0EUAYtc',                   'bKash merchant app key'),
    ('bkash_app_secret',   'jcUNPBgbcqEDedNKdvE4G1cAK7D3hCjmJccNPZZBq96QIxxwAMEx', 'bKash merchant app secret'),
    ('bkash_username',     '01770618567',                                  'bKash merchant username'),
    ('bkash_password',     'D7DaC<*E*eG',                                  'bKash merchant password'),
    ('bkash_callback_url', 'http://103.187.22.131:3001/payment/callback',  'Where bKash redirects after payment')
ON CONFLICT (setting_key) DO NOTHING;
