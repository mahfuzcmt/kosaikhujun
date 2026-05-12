package com.kosaibari.service;

import com.kosaibari.domain.Butcher;
import com.kosaibari.domain.Customer;
import com.kosaibari.domain.User;
import com.kosaibari.dto.AuthResponse;
import com.kosaibari.repository.ButcherRepository;
import com.kosaibari.repository.CustomerRepository;
import com.kosaibari.repository.UserRepository;
import com.kosaibari.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final OtpService otpService;
    private final SmsService smsService;
    private final JwtService jwtService;
    private final UserRepository userRepo;
    private final ButcherRepository butcherRepo;
    private final CustomerRepository customerRepo;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(12);

    public String sendOtp(String phone) {
        String otp = otpService.generateAndStore(phone);
        smsService.sendOtp(phone, otp);
        // Return OTP only in dev mode for testing
        return smsService.isDevMode() ? otp : null;
    }

    public AuthResponse verifyOtp(String phone, String code) {
        if (!otpService.verify(phone, code)) {
            throw new RuntimeException("Invalid or expired OTP");
        }

        Optional<User> existingUser = userRepo.findByPhone(phone);
        boolean isNewUser = existingUser.isEmpty();

        User user;
        if (isNewUser) {
            // Create new unverified user - will need to complete registration
            user = userRepo.create(phone, null, User.UserType.CUSTOMER);
        } else {
            user = existingUser.get();
            userRepo.updateVerified(user.getId(), true);
            user.setVerified(true);
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        // Fetch profile if exists
        Object profile = null;
        if (user.getUserType() == User.UserType.BUTCHER) {
            profile = butcherRepo.findByUserId(user.getId()).orElse(null);
        } else if (user.getUserType() == User.UserType.CUSTOMER) {
            profile = customerRepo.findByUserId(user.getId()).orElse(null);
        }

        return AuthResponse.of(accessToken, refreshToken, user, profile, isNewUser);
    }

    public AuthResponse refresh(String refreshToken) {
        if (jwtService.isRefreshToken(refreshToken)) {
            var userIdOpt = jwtService.extractUserId(refreshToken);
            if (userIdOpt.isPresent()) {
                var user = userRepo.findById(userIdOpt.get())
                    .orElseThrow(() -> new RuntimeException("User not found"));

                String accessToken = jwtService.generateAccessToken(user);
                String newRefreshToken = jwtService.generateRefreshToken(user);

                Object profile = null;
                if (user.getUserType() == User.UserType.BUTCHER) {
                    profile = butcherRepo.findByUserId(user.getId()).orElse(null);
                } else if (user.getUserType() == User.UserType.CUSTOMER) {
                    profile = customerRepo.findByUserId(user.getId()).orElse(null);
                }

                return AuthResponse.of(accessToken, newRefreshToken, user, profile, false);
            }
        }
        throw new RuntimeException("Invalid refresh token");
    }

    /**
     * Login with phone and password
     */
    public AuthResponse loginWithPassword(String phone, String password) {
        User user = userRepo.findByPhone(phone)
            .orElseThrow(() -> new RuntimeException("ফোন নম্বর বা পাসওয়ার্ড ভুল"));

        if (!user.hasPassword()) {
            throw new RuntimeException("এই অ্যাকাউন্টে পাসওয়ার্ড সেট করা হয়নি। OTP দিয়ে লগইন করুন।");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new RuntimeException("ফোন নম্বর বা পাসওয়ার্ড ভুল");
        }

        if (!user.isActive()) {
            throw new RuntimeException("আপনার অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে");
        }

        userRepo.updateLastLogin(user.getId());

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        Object profile = null;
        if (user.getUserType() == User.UserType.BUTCHER) {
            profile = butcherRepo.findByUserId(user.getId()).orElse(null);
        } else if (user.getUserType() == User.UserType.CUSTOMER) {
            profile = customerRepo.findByUserId(user.getId()).orElse(null);
        }

        return AuthResponse.of(accessToken, refreshToken, user, profile, false);
    }

    /**
     * Register new user with phone and password
     */
    public AuthResponse registerWithPassword(String phone, String password, String name) {
        // Check if user already exists
        if (userRepo.findByPhone(phone).isPresent()) {
            throw new RuntimeException("এই ফোন নম্বর দিয়ে আগেই রেজিস্ট্রেশন করা হয়েছে");
        }

        // Validate password
        if (password == null || password.length() < 6) {
            throw new RuntimeException("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
        }

        String passwordHash = passwordEncoder.encode(password);
        User user = userRepo.createWithPassword(phone, name, passwordHash, User.UserType.CUSTOMER);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        return AuthResponse.of(accessToken, refreshToken, user, null, true);
    }

    /**
     * Set password for existing user (after OTP verification)
     */
    public void setPassword(String phone, String password) {
        User user = userRepo.findByPhone(phone)
            .orElseThrow(() -> new RuntimeException("ইউজার পাওয়া যায়নি"));

        if (password == null || password.length() < 6) {
            throw new RuntimeException("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
        }

        String passwordHash = passwordEncoder.encode(password);
        userRepo.updatePassword(user.getId(), passwordHash);
    }

    /**
     * Reset password using OTP
     */
    public void resetPassword(String phone, String otp, String newPassword) {
        if (!otpService.verify(phone, otp)) {
            throw new RuntimeException("Invalid or expired OTP");
        }

        User user = userRepo.findByPhone(phone)
            .orElseThrow(() -> new RuntimeException("ইউজার পাওয়া যায়নি"));

        if (newPassword == null || newPassword.length() < 6) {
            throw new RuntimeException("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
        }

        String passwordHash = passwordEncoder.encode(newPassword);
        userRepo.updatePassword(user.getId(), passwordHash);
    }

    /**
     * Check if user has password set
     */
    public boolean hasPassword(String phone) {
        return userRepo.findByPhone(phone)
            .map(User::hasPassword)
            .orElse(false);
    }
}
