package com.kosaibari.api;

import com.kosaibari.domain.AppSettings;
import com.kosaibari.domain.Butcher;
import com.kosaibari.domain.ButcherAvailability;
import com.kosaibari.domain.District;
import com.kosaibari.domain.Thana;
import com.kosaibari.domain.User;
import com.kosaibari.dto.ButcherDto;
import com.kosaibari.dto.UserDto;
import com.kosaibari.repository.AppSettingsRepository;
import com.kosaibari.repository.LocationRepository;
import com.kosaibari.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    private final LocationRepository locationRepo;
    private final AppSettingsRepository settingsRepo;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(Map.of(
            "data", adminService.getStats()
        ));
    }

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> getUsers(
        @RequestParam(required = false) String type,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        List<User> users = adminService.getUsers(type, page, limit);
        return ResponseEntity.ok(Map.of(
            "data", users.stream().map(UserDto::from).toList()
        ));
    }

    @GetMapping("/butchers/pending")
    public ResponseEntity<Map<String, Object>> getPendingButchers() {
        List<Butcher> butchers = adminService.getPendingButchers();
        return ResponseEntity.ok(Map.of(
            "data", butchers.stream().map(b -> ButcherDto.from(b, true)).toList()
        ));
    }

    @PostMapping("/butchers/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveButcher(@PathVariable UUID id) {
        Butcher butcher = adminService.approveButcher(id);
        return ResponseEntity.ok(Map.of(
            "data", ButcherDto.from(butcher, true),
            "message", "Butcher approved successfully"
        ));
    }

    @PostMapping("/butchers/{id}/block")
    public ResponseEntity<Map<String, Object>> blockButcher(@PathVariable UUID id) {
        Butcher butcher = adminService.blockButcher(id);
        return ResponseEntity.ok(Map.of(
            "data", ButcherDto.from(butcher, true),
            "message", "Butcher blocked"
        ));
    }

    // Butcher availability management by user_id (admin override — works for any butcher).
    // Path uses user_id because the admin UI navigates from /admin/users where rows carry user_id;
    // we resolve to butcher_id in AdminService.
    @GetMapping("/users/{userId}/butcher")
    public ResponseEntity<Map<String, Object>> getButcherForUser(@PathVariable UUID userId) {
        Butcher butcher = adminService.getButcherForUser(userId);
        return ResponseEntity.ok(Map.of("data", ButcherDto.from(butcher, true)));
    }

    @GetMapping("/users/{userId}/butcher-availability")
    public ResponseEntity<Map<String, Object>> getButcherAvailability(
        @PathVariable UUID userId,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to
    ) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now();
        LocalDate toDate = to != null ? LocalDate.parse(to) : fromDate.plusDays(30);
        List<ButcherAvailability> availability = adminService.getButcherAvailabilityByUser(userId, fromDate, toDate);
        return ResponseEntity.ok(Map.of("data", availability));
    }

    @PostMapping("/users/{userId}/butcher-availability")
    public ResponseEntity<Map<String, Object>> setButcherAvailability(
        @PathVariable UUID userId,
        @RequestBody Map<String, String> req
    ) {
        LocalDate date = LocalDate.parse(req.get("date"));
        ButcherAvailability.AvailabilityStatus status =
            ButcherAvailability.AvailabilityStatus.valueOf(req.get("status"));
        String note = req.get("note");
        adminService.setButcherAvailabilityByUser(userId, date, status, note);
        return ResponseEntity.ok(Map.of("success", true, "message", "Availability updated"));
    }

    @DeleteMapping("/users/{userId}/butcher-availability")
    public ResponseEntity<Map<String, Object>> deleteButcherAvailability(
        @PathVariable UUID userId,
        @RequestParam String date
    ) {
        adminService.deleteButcherAvailabilityByUser(userId, LocalDate.parse(date));
        return ResponseEntity.ok(Map.of("success", true));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable UUID id) {
        adminService.deleteUser(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PatchMapping("/users/{id}/active")
    public ResponseEntity<Map<String, Object>> toggleUserActive(
        @PathVariable UUID id,
        @RequestBody Map<String, Boolean> req
    ) {
        Boolean active = req.get("active");
        if (active == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("message", "active field is required")
            ));
        }
        adminService.toggleUserActive(id, active);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // Location management
    @PostMapping("/districts")
    public ResponseEntity<Map<String, Object>> createDistrict(@RequestBody Map<String, String> req) {
        District district = locationRepo.createDistrict(req.get("nameBn"), req.get("nameEn"));
        return ResponseEntity.ok(Map.of("data", district));
    }

    @PostMapping("/thanas")
    public ResponseEntity<Map<String, Object>> createThana(@RequestBody Map<String, Object> req) {
        Integer districtId = (Integer) req.get("districtId");
        String nameBn = (String) req.get("nameBn");
        String nameEn = (String) req.get("nameEn");
        Thana thana = locationRepo.createThana(districtId, nameBn, nameEn);
        return ResponseEntity.ok(Map.of("data", thana));
    }

    // App Settings Management
    @GetMapping("/settings")
    public ResponseEntity<Map<String, Object>> getAllSettings() {
        List<AppSettings> settings = settingsRepo.findAll();
        return ResponseEntity.ok(Map.of("data", settings));
    }

    @GetMapping("/settings/sms")
    public ResponseEntity<Map<String, Object>> getSmsSettings() {
        List<AppSettings> settings = settingsRepo.findByKeyPrefix("sms_");
        return ResponseEntity.ok(Map.of("data", settings));
    }

    @GetMapping("/settings/bkash")
    public ResponseEntity<Map<String, Object>> getBkashSettings() {
        List<AppSettings> settings = settingsRepo.findByKeyPrefix("bkash_");
        return ResponseEntity.ok(Map.of("data", settings));
    }

    @PatchMapping("/settings/{key}")
    public ResponseEntity<Map<String, Object>> updateSetting(
        @PathVariable String key,
        @RequestBody Map<String, String> req
    ) {
        String value = req.get("value");
        settingsRepo.update(key, value);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Setting updated successfully"
        ));
    }

    @PostMapping("/settings/sms")
    public ResponseEntity<Map<String, Object>> updateSmsSettings(@RequestBody Map<String, String> req) {
        if (req.containsKey("devMode")) {
            settingsRepo.update("sms_dev_mode", req.get("devMode"));
        }
        if (req.containsKey("apiKey")) {
            settingsRepo.update("sms_api_key", req.get("apiKey"));
        }
        if (req.containsKey("secretKey")) {
            settingsRepo.update("sms_secret_key", req.get("secretKey"));
        }
        if (req.containsKey("senderId")) {
            settingsRepo.update("sms_sender_id", req.get("senderId"));
        }
        if (req.containsKey("apiUrl")) {
            settingsRepo.update("sms_api_url", req.get("apiUrl"));
        }
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "SMS settings updated successfully"
        ));
    }

    @PostMapping("/settings/bkash")
    public ResponseEntity<Map<String, Object>> updateBkashSettings(@RequestBody Map<String, String> req) {
        Map<String, String> fieldToKey = Map.of(
            "baseUrl",     "bkash_base_url",
            "appKey",      "bkash_app_key",
            "appSecret",   "bkash_app_secret",
            "username",    "bkash_username",
            "password",    "bkash_password",
            "callbackUrl", "bkash_callback_url"
        );
        for (var entry : fieldToKey.entrySet()) {
            if (req.containsKey(entry.getKey())) {
                settingsRepo.update(entry.getValue(), req.get(entry.getKey()));
            }
        }
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "bKash settings updated successfully"
        ));
    }
}
