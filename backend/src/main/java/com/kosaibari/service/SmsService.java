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
    private static final String KEY_SENDER_ID = "sms_sender_id";
    private static final String KEY_API_URL = "sms_api_url";

    // Defaults
    private static final String DEFAULT_API_URL = "http://bulksmsbd.net/api/smsapi";
    private static final String DEFAULT_SENDER_ID = "8809617642636";

    public void sendOtp(String phone, String otp) {
        String message = String.format("কসাই বাড়ি: আপনার OTP কোড হলো %s। এই কোড ৫ মিনিট বৈধ।", otp);
        send(phone, message);
    }

    public void sendPackagePurchaseConfirmation(String phone, String packageName, int contactLimit, String trxId) {
        String message = String.format(
            "কসাই বাড়ি: আপনার \"%s\" প্যাকেজ সফলভাবে কেনা হয়েছে। আপনি এখন %d জন কসাইয়ের নম্বর দেখতে পারবেন। TrxID: %s",
            packageName, contactLimit, trxId
        );
        send(phone, message);
    }

    public void sendUnlockLimitReached(String phone, String butcherName, int unlockCount) {
        String message = String.format(
            "কসাই বাড়ি: অভিনন্দন %s! আপনার প্রোফাইল %d জন গ্রাহক আনলক করেছেন এবং আপনার সীমা পূর্ণ হয়েছে।",
            butcherName, unlockCount
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

            String url = UriComponentsBuilder.fromUriString(apiUrl)
                .queryParam("api_key", apiKey)
                .queryParam("type", "text")
                .queryParam("number", formattedPhone)
                .queryParam("senderid", senderId)
                .queryParam("message", message)
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
        if (phone.startsWith("+")) {
            phone = phone.substring(1);
        }
        if (phone.startsWith("0")) {
            phone = "880" + phone.substring(1);
        }
        if (!phone.startsWith("880")) {
            phone = "880" + phone;
        }
        return phone;
    }

    public boolean isDevMode() {
        return settingsRepo.getBooleanValue(KEY_DEV_MODE, true);
    }
}
