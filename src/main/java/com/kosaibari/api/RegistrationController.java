package com.kosaibari.api;

import com.kosaibari.domain.Butcher;
import com.kosaibari.domain.Customer;
import com.kosaibari.dto.ButcherDto;
import com.kosaibari.dto.ButcherRegisterRequest;
import com.kosaibari.dto.CustomerRegisterRequest;
import com.kosaibari.service.ButcherService;
import com.kosaibari.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/register")
@RequiredArgsConstructor
public class RegistrationController {

    private final ButcherService butcherService;
    private final CustomerService customerService;

    @PostMapping("/butcher")
    public ResponseEntity<Map<String, Object>> registerButcher(@RequestBody ButcherRegisterRequest req) {
        Butcher butcher = butcherService.register(req);
        return ResponseEntity.ok(Map.of(
            "data", ButcherDto.from(butcher, true),
            "message", "Registration successful. Waiting for admin approval."
        ));
    }

    @PostMapping("/customer")
    public ResponseEntity<Map<String, Object>> registerCustomer(@RequestBody CustomerRegisterRequest req) {
        Customer customer = customerService.register(req);
        return ResponseEntity.ok(Map.of(
            "data", customer,
            "message", "Registration successful"
        ));
    }
}
