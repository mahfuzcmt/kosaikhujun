package com.kosaibari.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
@Slf4j
public class SmsService {

    @Value("${kosaibari.sms.api-key:}")
    private String apiKey;

    @Value("${kosaibari.sms.sender-id:8809617642636}")
    private String senderId;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    // BulkSMSBD API endpoint
    private static final String SMS_API_URL = "http://bulksmsbd.net/api/smsapi";

    public void sendOtp(String phone, String otp) {
        String message = String.format("কসাই বাড়ি: আপনার OTP কোড হলো %s। এই কোড ৫ মিনিট বৈধ।", otp);
        send(phone, message);
    }

    public void send(String phone, String message) {
        // In dev mode, just log the message
        if ("dev".equals(activeProfile) || apiKey == null || apiKey.isEmpty()) {
            log.info("DEV MODE - SMS to {}: {}", phone, message);
            return;
        }

        try {
            String formattedPhone = formatPhone(phone);

            String url = UriComponentsBuilder.fromUriString(SMS_API_URL)
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
        // Ensure phone starts with 880
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
        return "dev".equals(activeProfile) || apiKey == null || apiKey.isEmpty();
    }
}
