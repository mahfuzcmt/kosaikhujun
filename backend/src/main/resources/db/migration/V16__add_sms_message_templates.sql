-- ============================================================
-- V16 — Store SMS message templates in app_settings so admins
-- can edit them from /admin/settings without a redeploy.
--
-- Placeholders use {name} syntax and are substituted by
-- SmsService.renderTemplate() in Java.
--
--   sms_tpl_otp                placeholders: {otp}
--   sms_tpl_package_purchase   placeholders: {packageName}, {contactLimit}, {trxId}
--   sms_tpl_unlock_limit       placeholders: {butcherName}, {unlockCount}
--   sms_tpl_contact_limit      placeholders: {customerName}
-- ============================================================

INSERT INTO app_settings (setting_key, setting_value, description) VALUES
    ('sms_tpl_otp',
     'কসাই লাগবে স্বাগতম।  আপনার ভেরিফিকেশন কোড: {otp}। মেয়াদ ৫ মিনিট',
     'OTP SMS template. Placeholders: {otp}'),
    ('sms_tpl_package_purchase',
     'কসাই লাগবে: আপনার "{packageName}" প্যাকেজ সফলভাবে কেনা হয়েছে। আপনি এখন {contactLimit} জন কসাইয়ের নম্বর দেখতে পারবেন। TrxID: {trxId}',
     'Package purchase confirmation SMS template. Placeholders: {packageName}, {contactLimit}, {trxId}'),
    ('sms_tpl_unlock_limit',
     'কসাই লাগবে: অভিনন্দন {butcherName}! আপনার প্রোফাইল {unlockCount} জন গ্রাহক আনলক করেছেন এবং আপনার সীমা পূর্ণ হয়েছে।',
     'Butcher unlock-limit-reached SMS template. Placeholders: {butcherName}, {unlockCount}'),
    ('sms_tpl_contact_limit',
     'কসাই লাগবে: প্রিয় {customerName}, আপনার কন্টাক্ট ভিউয়ের সীমা শেষ হয়েছে। আরো কসাইয়ের নম্বর দেখতে নতুন প্যাকেজ কিনুন।',
     'Customer contact-limit-reached SMS template. Placeholders: {customerName}')
ON CONFLICT (setting_key) DO NOTHING;
