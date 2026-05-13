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

    @Value("${kosaibari.sms.api-key:0ffe1d6a29e4a4d1}")
    private String apiKey;

    @Value("${kosaibari.sms.secret-key:a2185de9}")
    private String secretKey;

    @Value("${kosaibari.sms.sender-id:01844015757}")
    private String senderId;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    // smsvaults.work API endpoint
    private static final String SMS_API_URL = "http://cpanel.smsvaults.work/sendtext";

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
        return "dev".equals(activeProfile) || apiKey == null || apiKey.isEmpty();
    }
}
