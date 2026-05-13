package com.kosaibari.service;

import com.kosaibari.repository.AppSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
@Slf4j
public class SmsService {

    private final AppSettingsRepository settingsRepo;

    // Setting keys
    private static final String KEY_DEV_MODE = "sms_dev_mode";
    private static final String KEY_API_KEY = "sms_api_key";
    private static final String KEY_SECRET_KEY = "sms_secret_key";
    private static final String KEY_SENDER_ID = "sms_sender_id";
    private static final String KEY_API_URL = "sms_api_url";

    // Defaults (smsvaults.work provider)
    private static final String DEFAULT_API_URL = "http://cpanel.smsvaults.work/sendtext";
    private static final String DEFAULT_SENDER_ID = "01844015757";

    public void sendOtp(String phone, String otp) {
        String message = String.format("কসাই লাগবে স্বাগতম।  আপনার ভেরিফিকেশন কোড: %s। মেয়াদ ৫ মিনিট", otp);
        send(phone, message);
    }

    public void sendPackagePurchaseConfirmation(String phone, String packageName, int contactLimit, String trxId) {
        String message = String.format(
            "কসাই লাগবে: আপনার \"%s\" প্যাকেজ সফলভাবে কেনা হয়েছে। আপনি এখন %d জন কসাইয়ের নম্বর দেখতে পারবেন। TrxID: %s",
            packageName, contactLimit, trxId
        );
        send(phone, message);
    }

    public void sendUnlockLimitReached(String phone, String butcherName, int unlockCount) {
        String message = String.format(
            "কসাই লাগবে: অভিনন্দন %s! আপনার প্রোফাইল %d জন গ্রাহক আনলক করেছেন এবং আপনার সীমা পূর্ণ হয়েছে।",
            butcherName, unlockCount
        );
        send(phone, message);
    }

    public void sendContactLimitReached(String phone, String customerName) {
        String name = (customerName != null && !customerName.isBlank()) ? customerName : "গ্রাহক";
        String message = String.format(
            "কসাই লাগবে: প্রিয় %s, আপনার কন্টাক্ট ভিউয়ের সীমা শেষ হয়েছে। আরো কসাইয়ের নম্বর দেখতে নতুন প্যাকেজ কিনুন।",
            name
        );
        send(phone, message);
    }

    public void send(String phone, String message) {
        boolean devMode = isDevMode();
        String apiKey = settingsRepo.getValue(KEY_API_KEY, "");

        // In dev mode or if no API key, just log the message
        if (devMode || apiKey == null || apiKey.isEmpty()) {
            log.info("DEV MODE - SMS to {}: {}", phone, message);
            return;
        }

        try {
            String formattedPhone = formatPhone(phone);
            String apiUrl = settingsRepo.getValue(KEY_API_URL, DEFAULT_API_URL);
            String senderId = settingsRepo.getValue(KEY_SENDER_ID, DEFAULT_SENDER_ID);
            String secretKey = settingsRepo.getValue(KEY_SECRET_KEY, "");

            String url = UriComponentsBuilder.fromUriString(apiUrl)
                .queryParam("apikey", apiKey)
                .queryParam("secretkey", secretKey)
                .queryParam("callerID", senderId)
                .queryParam("toUser", formattedPhone)
                .queryParam("messageContent", message)
                .build()
                .toUriString();

            RestClient client = RestClient.create();
            var response = client.get()
                .uri(url)
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
