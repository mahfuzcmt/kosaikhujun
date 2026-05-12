package com.kosaibari.api;

import com.kosaibari.domain.Customer;
import com.kosaibari.domain.User;
import com.kosaibari.dto.ButcherDto;
import com.kosaibari.dto.SubscriptionDto;
import com.kosaibari.dto.UserDto;
import com.kosaibari.repository.ButcherRepository;
import com.kosaibari.repository.CustomerRepository;
import com.kosaibari.security.UserContext;
import com.kosaibari.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/me")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;
    private final CustomerRepository customerRepo;
    private final ButcherRepository butcherRepo;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getMe() {
        User user = UserContext.require();
        Object profile = null;

        if (user.getUserType() == User.UserType.CUSTOMER) {
            profile = customerRepo.findByUserId(user.getId()).orElse(null);
        } else if (user.getUserType() == User.UserType.BUTCHER) {
            profile = butcherRepo.findByUserId(user.getId()).orElse(null);
        }

        return ResponseEntity.ok(Map.of(
            "data", Map.of(
                "user", UserDto.from(user),
                "profile", profile
            )
        ));
    }

    @GetMapping("/subscription")
    public ResponseEntity<Map<String, Object>> getSubscription() {
        try {
            SubscriptionDto sub = customerService.getCurrentSubscription();
            if (sub == null) {
                return ResponseEntity.ok(Map.of("data", Map.of()));
            }
            return ResponseEntity.ok(Map.of("data", sub));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("data", Map.of()));
        }
    }

    @GetMapping("/subscriptions")
    public ResponseEntity<Map<String, Object>> getAllSubscriptions() {
        try {
            List<SubscriptionDto> subs = customerService.getAllSubscriptions();
            return ResponseEntity.ok(Map.of("data", subs));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("data", List.of()));
        }
    }

    @GetMapping("/unlocked")
    public ResponseEntity<Map<String, Object>> getUnlockedButchers() {
        try {
            List<ButcherDto> butchers = customerService.getUnlockedButchers();
            return ResponseEntity.ok(Map.of("data", butchers));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("data", List.of()));
        }
    }

    @GetMapping("/favorites")
    public ResponseEntity<Map<String, Object>> getFavorites() {
        try {
            List<ButcherDto> butchers = customerService.getFavorites();
            return ResponseEntity.ok(Map.of("data", butchers));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("data", List.of()));
        }
    }
}
