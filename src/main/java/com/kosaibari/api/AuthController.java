package com.kosaibari.api;

import com.kosaibari.dto.AuthRequest;
import com.kosaibari.dto.AuthResponse;
import com.kosaibari.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, Object>> sendOtp(@RequestBody Map<String, String> req) {
        String phone = req.get("phone");
        if (phone == null || phone.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "INVALID_PHONE", "message", "Phone number is required")
            ));
        }
        String otp = authService.sendOtp(phone);

        var data = new java.util.HashMap<String, Object>();
        data.put("success", true);
        data.put("message", "OTP sent successfully");
        // Include OTP in dev mode for testing
        if (otp != null) {
            data.put("otp", otp);
            data.put("devMode", true);
        }
        return ResponseEntity.ok(Map.of("data", data));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, Object>> verifyOtp(@RequestBody AuthRequest req) {
        AuthResponse response = authService.verifyOtp(req.phone(), req.code());
        return ResponseEntity.ok(Map.of(
            "data", response
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refresh(@RequestBody Map<String, String> req) {
        String refreshToken = req.get("refreshToken");
        AuthResponse response = authService.refresh(refreshToken);
        return ResponseEntity.ok(Map.of(
            "data", response
        ));
    }

    /**
     * Password-based login
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> req) {
        String phone = req.get("phone");
        String password = req.get("password");

        if (phone == null || phone.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "INVALID_PHONE", "message", "ফোন নম্বর দিন")
            ));
        }
        if (password == null || password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "INVALID_PASSWORD", "message", "পাসওয়ার্ড দিন")
            ));
        }

        try {
            AuthResponse response = authService.loginWithPassword(phone, password);
            return ResponseEntity.ok(Map.of("data", response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "LOGIN_FAILED", "message", e.getMessage())
            ));
        }
    }

    /**
     * Register with password
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> req) {
        String phone = req.get("phone");
        String password = req.get("password");
        String name = req.get("name");

        if (phone == null || phone.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "INVALID_PHONE", "message", "ফোন নম্বর দিন")
            ));
        }
        if (password == null || password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "INVALID_PASSWORD", "message", "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে")
            ));
        }

        try {
            AuthResponse response = authService.registerWithPassword(phone, password, name);
            return ResponseEntity.ok(Map.of("data", response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "REGISTER_FAILED", "message", e.getMessage())
            ));
        }
    }

    /**
     * Set password for existing user
     */
    @PostMapping("/set-password")
    public ResponseEntity<Map<String, Object>> setPassword(@RequestBody Map<String, String> req) {
        String phone = req.get("phone");
        String password = req.get("password");

        try {
            authService.setPassword(phone, password);
            return ResponseEntity.ok(Map.of("data", Map.of("success", true)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "SET_PASSWORD_FAILED", "message", e.getMessage())
            ));
        }
    }

    /**
     * Reset password with OTP
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, String> req) {
        String phone = req.get("phone");
        String otp = req.get("otp");
        String newPassword = req.get("newPassword");

        try {
            authService.resetPassword(phone, otp, newPassword);
            return ResponseEntity.ok(Map.of("data", Map.of("success", true)));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "RESET_PASSWORD_FAILED", "message", e.getMessage())
            ));
        }
    }

    /**
     * Check if user has password set
     */
    @GetMapping("/has-password")
    public ResponseEntity<Map<String, Object>> hasPassword(@RequestParam String phone) {
        boolean hasPassword = authService.hasPassword(phone);
        return ResponseEntity.ok(Map.of("data", Map.of("hasPassword", hasPassword)));
    }
}
