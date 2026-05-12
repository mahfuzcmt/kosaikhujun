package com.kosaibari.api;

import com.kosaibari.domain.Butcher;
import com.kosaibari.domain.District;
import com.kosaibari.domain.Thana;
import com.kosaibari.domain.User;
import com.kosaibari.dto.ButcherDto;
import com.kosaibari.dto.UserDto;
import com.kosaibari.repository.LocationRepository;
import com.kosaibari.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

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
}
