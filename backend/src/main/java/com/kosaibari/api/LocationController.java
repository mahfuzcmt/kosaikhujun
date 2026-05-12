package com.kosaibari.api;

import com.kosaibari.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class LocationController {

    private final LocationRepository locationRepo;

    @GetMapping("/districts")
    public ResponseEntity<Map<String, Object>> getDistricts() {
        return ResponseEntity.ok(Map.of(
            "data", locationRepo.findAllDistricts()
        ));
    }

    @GetMapping("/districts/{id}")
    public ResponseEntity<Map<String, Object>> getDistrict(@PathVariable int id) {
        return ResponseEntity.ok(Map.of(
            "data", locationRepo.findDistrictById(id)
        ));
    }

    @GetMapping("/thanas")
    public ResponseEntity<Map<String, Object>> getThanas(@RequestParam(required = false) Integer districtId) {
        if (districtId != null) {
            return ResponseEntity.ok(Map.of(
                "data", locationRepo.findThanasByDistrict(districtId)
            ));
        }
        return ResponseEntity.ok(Map.of(
            "data", locationRepo.findAllThanas()
        ));
    }

    @GetMapping("/thanas/{id}")
    public ResponseEntity<Map<String, Object>> getThana(@PathVariable int id) {
        return ResponseEntity.ok(Map.of(
            "data", locationRepo.findThanaById(id)
        ));
    }
}
