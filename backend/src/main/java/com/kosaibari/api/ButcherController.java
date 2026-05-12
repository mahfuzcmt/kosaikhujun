package com.kosaibari.api;

import com.kosaibari.domain.Butcher;
import com.kosaibari.domain.ButcherAvailability;
import com.kosaibari.dto.ButcherDto;
import com.kosaibari.service.ButcherService;
import com.kosaibari.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/butchers")
@RequiredArgsConstructor
public class ButcherController {

    private final ButcherService butcherService;
    private final CustomerService customerService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> search(
        @RequestParam(required = false) Integer districtId,
        @RequestParam(required = false) Integer thanaId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int limit
    ) {
        List<ButcherDto> butchers = butcherService.search(districtId, thanaId, page, limit);
        int total = butcherService.countApproved(districtId, thanaId);

        return ResponseEntity.ok(Map.of(
            "data", butchers,
            "page", Map.of(
                "total", total,
                "page", page,
                "limit", limit
            )
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getById(@PathVariable UUID id) {
        ButcherDto butcher = butcherService.getById(id);
        return ResponseEntity.ok(Map.of("data", butcher));
    }

    @PostMapping("/{id}/unlock")
    public ResponseEntity<Map<String, Object>> unlock(@PathVariable UUID id) {
        ButcherDto butcher = butcherService.unlock(id);
        return ResponseEntity.ok(Map.of(
            "data", butcher,
            "message", "Contact unlocked successfully"
        ));
    }

    @PostMapping("/{id}/favorite")
    public ResponseEntity<Map<String, Object>> addFavorite(@PathVariable UUID id) {
        customerService.addFavorite(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @DeleteMapping("/{id}/favorite")
    public ResponseEntity<Map<String, Object>> removeFavorite(@PathVariable UUID id) {
        customerService.removeFavorite(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // Butcher's own profile management
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyProfile() {
        Butcher butcher = butcherService.getCurrentButcher();
        return ResponseEntity.ok(Map.of("data", ButcherDto.from(butcher, true)));
    }

    @PatchMapping("/me")
    public ResponseEntity<Map<String, Object>> updateMyProfile(@RequestBody Map<String, Object> req) {
        String name = (String) req.get("name");
        String whatsapp = (String) req.get("whatsapp");
        String photoUrl = (String) req.get("photoUrl");
        Integer cowPrice = req.get("cowPrice") != null ? ((Number) req.get("cowPrice")).intValue() : null;
        String cowPriceType = (String) req.get("cowPriceType");
        Integer goatPrice = req.get("goatPrice") != null ? ((Number) req.get("goatPrice")).intValue() : null;
        String goatPriceType = (String) req.get("goatPriceType");
        Integer cowCapacity = req.get("cowCapacity") != null ? ((Number) req.get("cowCapacity")).intValue() : null;
        Integer goatCapacity = req.get("goatCapacity") != null ? ((Number) req.get("goatCapacity")).intValue() : null;

        @SuppressWarnings("unchecked")
        List<Integer> thanaIds = req.get("thanaIds") != null ?
            ((List<Number>) req.get("thanaIds")).stream().map(Number::intValue).toList() : null;

        Butcher butcher = butcherService.updateProfile(name, whatsapp, photoUrl,
            cowPrice, cowPriceType, goatPrice, goatPriceType,
            cowCapacity, goatCapacity, thanaIds);

        return ResponseEntity.ok(Map.of(
            "data", ButcherDto.from(butcher, true),
            "message", "Profile updated successfully"
        ));
    }

    // Availability management
    @GetMapping("/me/availability")
    public ResponseEntity<Map<String, Object>> getMyAvailability(
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to
    ) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now();
        LocalDate toDate = to != null ? LocalDate.parse(to) : fromDate.plusDays(30);

        List<ButcherAvailability> availability = butcherService.getMyAvailability(fromDate, toDate);
        return ResponseEntity.ok(Map.of("data", availability));
    }

    @PostMapping("/me/availability")
    public ResponseEntity<Map<String, Object>> setMyAvailability(@RequestBody Map<String, String> req) {
        LocalDate date = LocalDate.parse(req.get("date"));
        ButcherAvailability.AvailabilityStatus status =
            ButcherAvailability.AvailabilityStatus.valueOf(req.get("status"));
        String note = req.get("note");

        butcherService.setAvailability(date, status, note);
        return ResponseEntity.ok(Map.of("success", true, "message", "Availability updated"));
    }

    @DeleteMapping("/me/availability")
    public ResponseEntity<Map<String, Object>> deleteMyAvailability(@RequestParam String date) {
        butcherService.deleteAvailability(LocalDate.parse(date));
        return ResponseEntity.ok(Map.of("success", true));
    }

    // Get butcher's availability (for customers to see)
    @GetMapping("/{id}/availability")
    public ResponseEntity<Map<String, Object>> getButcherAvailability(
        @PathVariable UUID id,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to
    ) {
        LocalDate fromDate = from != null ? LocalDate.parse(from) : LocalDate.now();
        LocalDate toDate = to != null ? LocalDate.parse(to) : fromDate.plusDays(30);

        List<ButcherAvailability> availability = butcherService.getAvailability(id, fromDate, toDate);
        return ResponseEntity.ok(Map.of("data", availability));
    }
}
