package com.kosaibari.service;

import com.kosaibari.repository.AppSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SmsService {

    private final AppSettingsRepository settingsRepo;

    // Provider setting keys
    private static final String KEY_DEV_MODE = "sms_dev_mode";
    private static final String KEY_USER_ID = "sms_user_id";
    private static final String KEY_PASSWORD = "sms_password";
    private static final String KEY_API_URL = "sms_api_url";

    // Template setting keys (editable from /admin/settings without redeploy)
    private static final String KEY_TPL_OTP = "sms_tpl_otp";
    private static final String KEY_TPL_PACKAGE_PURCHASE = "sms_tpl_package_purchase";
    private static final String KEY_TPL_UNLOCK_LIMIT = "sms_tpl_unlock_limit";
    private static final String KEY_TPL_CONTACT_LIMIT = "sms_tpl_contact_limit";

    // Defaults (durbar71.com provider)
    private static final String DEFAULT_API_URL = "https://sms.durbar71.com/httpapi/sendsms";

    // Template fallbacks — used only if the DB row is missing/blank.
    // Authoritative defaults live in the V16 Flyway migration.
    private static final String DEFAULT_TPL_OTP =
        "কসাই লাগবে স্বাগতম।  আপনার ভেরিফিকেশন কোড: {otp}। মেয়াদ ৫ মিনিট";
    private static final String DEFAULT_TPL_PACKAGE_PURCHASE =
        "কসাই লাগবে: আপনার \"{packageName}\" প্যাকেজ সফলভাবে কেনা হয়েছে। "
            + "আপনি এখন {contactLimit} জন কসাইয়ের নম্বর দেখতে পারবেন। TrxID: {trxId}";
    private static final String DEFAULT_TPL_UNLOCK_LIMIT =
        "কসাই লাগবে: অভিনন্দন {butcherName}! আপনার প্রোফাইল {unlockCount} জন গ্রাহক "
            + "আনলক করেছেন এবং আপনার সীমা পূর্ণ হয়েছে।";
    private static final String DEFAULT_TPL_CONTACT_LIMIT =
        "কসাই লাগবে: প্রিয় {customerName}, আপনার কন্টাক্ট ভিউয়ের সীমা শেষ হয়েছে। "
            + "আরো কসাইয়ের নম্বর দেখতে নতুন প্যাকেজ কিনুন।";

    public void sendOtp(String phone, String otp) {
        String message = renderTemplate(KEY_TPL_OTP, DEFAULT_TPL_OTP,
            Map.of("otp", otp));
        send(phone, message);
    }

    public void sendPackagePurchaseConfirmation(String phone, String packageName, int contactLimit, String trxId) {
        String message = renderTemplate(KEY_TPL_PACKAGE_PURCHASE, DEFAULT_TPL_PACKAGE_PURCHASE,
            Map.of(
                "packageName", packageName == null ? "" : packageName,
                "contactLimit", contactLimit,
                "trxId", trxId == null ? "" : trxId
            ));
        send(phone, message);
    }

    public void sendUnlockLimitReached(String phone, String butcherName, int unlockCount) {
        String message = renderTemplate(KEY_TPL_UNLOCK_LIMIT, DEFAULT_TPL_UNLOCK_LIMIT,
            Map.of(
                "butcherName", butcherName == null ? "" : butcherName,
                "unlockCount", unlockCount
            ));
        send(phone, message);
    }

    public void sendContactLimitReached(String phone, String customerName) {
        String name = (customerName != null && !customerName.isBlank()) ? customerName : "গ্রাহক";
        String message = renderTemplate(KEY_TPL_CONTACT_LIMIT, DEFAULT_TPL_CONTACT_LIMIT,
            Map.of("customerName", name));
        send(phone, message);
    }

    private String renderTemplate(String key, String fallback, Map<String, Object> vars) {
        String template = settingsRepo.getValue(key, fallback);
        if (template == null || template.isBlank()) {
            template = fallback;
        }
        for (Map.Entry<String, Object> e : vars.entrySet()) {
            template = template.replace("{" + e.getKey() + "}", String.valueOf(e.getValue()));
        }
        return template;
    }

    public void send(String phone, String message) {
        boolean devMode = isDevMode();
        String userId = settingsRepo.getValue(KEY_USER_ID, "");

        // In dev mode or if no credentials, just log the message
        if (devMode || userId == null || userId.isEmpty()) {
            log.info("DEV MODE - SMS to {}: {}", phone, message);
            return;
        }

        try {
            String formattedPhone = formatPhone(phone);
            String apiUrl = settingsRepo.getValue(KEY_API_URL, DEFAULT_API_URL);
            String password = settingsRepo.getValue(KEY_PASSWORD, "");

            // durbar71.com HTTP API: POST application/x-www-form-urlencoded
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("userId", userId);
            form.add("password", password);
            form.add("smsText", message);
            form.add("commaSeperatedReceiverNumbers", formattedPhone);

            RestClient client = RestClient.create();
            var response = client.post()
                .uri(apiUrl)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(String.class);

            log.info("SMS sent to {}: response={}", phone, response);
        } catch (Exception e) {
            log.error("Failed to send SMS to {}: {}", phone, e.getMessage());
        }
    }

    private String formatPhone(String phone) {
        phone = phone.replaceAll("[^0-9]", "");
        if (phone.startsWith("880")) {
            phone = phone.substring(3);
        }
        if (!phone.startsWith("0")) {
            phone = "0" + phone;
        }
        return phone;
    }

    public boolean isDevMode() {
        return settingsRepo.getBooleanValue(KEY_DEV_MODE, true);
    }
}
