package com.kosaibari.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final StringRedisTemplate redisTemplate;
    private final SecureRandom random = new SecureRandom();

    @Value("${kosaibari.otp.length:4}")
    private int otpLength;

    @Value("${kosaibari.otp.expiry-minutes:5}")
    private int expiryMinutes;

    private static final String OTP_PREFIX = "otp:";
    private static final String RATE_LIMIT_PREFIX = "otp_rate:";

    public String generateAndStore(String phone) {
        // Rate limiting: max 5 OTPs per phone per 15 minutes
        String rateLimitKey = RATE_LIMIT_PREFIX + phone;
        Long count = redisTemplate.opsForValue().increment(rateLimitKey);
        if (count != null && count == 1) {
            redisTemplate.expire(rateLimitKey, Duration.ofMinutes(15));
        }
        if (count != null && count > 5) {
            throw new RuntimeException("Too many OTP requests. Please try again later.");
        }

        String otp = generateOtp();
        String key = OTP_PREFIX + phone;
        redisTemplate.opsForValue().set(key, otp, Duration.ofMinutes(expiryMinutes));
        log.info("Generated OTP for phone={} otp={}", phone, otp);
        return otp;
    }

    public boolean verify(String phone, String code) {
        String key = OTP_PREFIX + phone;
        String stored = redisTemplate.opsForValue().get(key);
        if (stored != null && stored.equals(code)) {
            redisTemplate.delete(key);
            return true;
        }
        return false;
    }

    private String generateOtp() {
        StringBuilder sb = new StringBuilder(otpLength);
        for (int i = 0; i < otpLength; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }
}
