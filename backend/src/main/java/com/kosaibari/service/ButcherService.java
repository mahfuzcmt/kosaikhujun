package com.kosaibari.service;

import com.kosaibari.domain.Butcher;
import com.kosaibari.domain.ButcherAvailability;
import com.kosaibari.domain.Subscription;
import com.kosaibari.domain.User;
import com.kosaibari.dto.ButcherDto;
import com.kosaibari.dto.ButcherRegisterRequest;
import com.kosaibari.repository.ButcherRepository;
import com.kosaibari.repository.CustomerRepository;
import com.kosaibari.repository.SubscriptionRepository;
import com.kosaibari.repository.UserRepository;
import com.kosaibari.security.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ButcherService {

    private final ButcherRepository butcherRepo;
    private final UserRepository userRepo;
    private final CustomerRepository customerRepo;
    private final SubscriptionRepository subscriptionRepo;
    private final SmsService smsService;

    @Transactional
    public Butcher register(ButcherRegisterRequest req) {
        User currentUser = UserContext.require();

        // Update user info
        userRepo.updateName(currentUser.getId(), req.name());
        userRepo.updateUserType(currentUser.getId(), User.UserType.BUTCHER);

        // Parse price types
        Butcher.PriceType cowPriceType = req.cowPriceType() != null ?
            Butcher.PriceType.valueOf(req.cowPriceType()) : Butcher.PriceType.PER_ANIMAL;
        Butcher.PriceType goatPriceType = req.goatPriceType() != null ?
            Butcher.PriceType.valueOf(req.goatPriceType()) : Butcher.PriceType.PER_ANIMAL;

        // Create butcher profile
        Butcher butcher = butcherRepo.create(
            currentUser.getId(),
            req.whatsapp(),
            req.cowPrice(),
            cowPriceType,
            req.goatPrice(),
            goatPriceType,
            req.cowCapacity(),
            req.goatCapacity()
        );

        // Assign service areas
        if (req.thanaIds() != null && !req.thanaIds().isEmpty()) {
            butcherRepo.assignThanas(butcher.getId(), req.thanaIds());
        }

        return butcherRepo.findById(butcher.getId()).orElse(butcher);
    }

    public List<ButcherDto> search(Integer districtId, Integer thanaId, String q, int page, int limit) {
        int offset = page * limit;
        List<Butcher> butchers = butcherRepo.findApproved(districtId, thanaId, q, offset, limit);

        // Check which butchers are unlocked for current customer
        User currentUser = UserContext.get();
        List<UUID> unlockedIds = List.of();
        if (currentUser != null && currentUser.getUserType() == User.UserType.CUSTOMER) {
            var customer = customerRepo.findByUserId(currentUser.getId());
            if (customer.isPresent()) {
                unlockedIds = subscriptionRepo.findUnlockedButcherIds(customer.get().getId());
            }
        }

        final List<UUID> finalUnlockedIds = unlockedIds;
        return butchers.stream()
            .map(b -> ButcherDto.from(b, finalUnlockedIds.contains(b.getId())))
            .toList();
    }

    public int countApproved(Integer districtId, Integer thanaId, String q) {
        return butcherRepo.countApproved(districtId, thanaId, q);
    }

    public ButcherDto getById(UUID id) {
        Butcher butcher = butcherRepo.findById(id)
            .orElseThrow(() -> new RuntimeException("Butcher not found"));

        boolean unlocked = false;
        User currentUser = UserContext.get();
        if (currentUser != null && currentUser.getUserType() == User.UserType.CUSTOMER) {
            var customer = customerRepo.findByUserId(currentUser.getId());
            if (customer.isPresent()) {
                unlocked = subscriptionRepo.hasUnlockedContact(customer.get().getId(), id);
            }
        }

        return ButcherDto.from(butcher, unlocked);
    }

    @Transactional
    public ButcherDto unlock(UUID butcherId) {
        User currentUser = UserContext.require();
        if (currentUser.getUserType() != User.UserType.CUSTOMER) {
            throw new RuntimeException("কসাইয়ের নম্বর শুধুমাত্র গ্রাহক পাবেন");
        }

        var customer = customerRepo.findByUserId(currentUser.getId())
            .orElseThrow(() -> new RuntimeException("Customer profile not found"));

        // Check if already unlocked
        if (subscriptionRepo.hasUnlockedContact(customer.getId(), butcherId)) {
            Butcher butcher = butcherRepo.findById(butcherId)
                .orElseThrow(() -> new RuntimeException("Butcher not found"));
            return ButcherDto.from(butcher, true);
        }

        // Find a subscription with remaining contacts (supports stacking multiple packages)
        Subscription sub = subscriptionRepo.findSubscriptionWithRemainingContacts(customer.getId())
            .orElseThrow(() -> new RuntimeException("No active subscription with remaining contacts. Please purchase a package."));

        // Unlock the contact
        subscriptionRepo.unlockContact(customer.getId(), butcherId, sub.getId());
        subscriptionRepo.incrementContactsUsed(sub.getId());

        // If the customer just exhausted their last remaining quota across all
        // active subscriptions (and has no unlimited package), nudge them to buy more.
        if (subscriptionRepo.findSubscriptionWithRemainingContacts(customer.getId()).isEmpty()) {
            try {
                if (currentUser.getPhone() != null) {
                    smsService.sendContactLimitReached(currentUser.getPhone(), currentUser.getName());
                    log.info("SMS sent to customer {} - contact view limit reached", currentUser.getPhone());
                }
            } catch (Exception smsEx) {
                log.error("Failed to send contact-limit SMS to customer: {}", smsEx.getMessage());
            }
        }

        // Fetch butcher with updated unlock count
        Butcher butcher = butcherRepo.findById(butcherId)
            .orElseThrow(() -> new RuntimeException("Butcher not found"));

        // Check if butcher's unlock limit has been reached
        if (butcher.getUnlockLimit() != null && butcher.getUnlockCount() != null) {
            if (butcher.getUnlockCount() >= butcher.getUnlockLimit()) {
                // Send SMS notification to butcher
                try {
                    User butcherUser = butcher.getUser();
                    if (butcherUser != null && butcherUser.getPhone() != null) {
                        String butcherName = butcherUser.getName() != null ? butcherUser.getName() : "কসাই";
                        smsService.sendUnlockLimitReached(
                            butcherUser.getPhone(),
                            butcherName,
                            butcher.getUnlockCount()
                        );
                        log.info("SMS sent to butcher {} - unlock limit reached ({})",
                            butcherUser.getPhone(), butcher.getUnlockCount());
                    }
                } catch (Exception smsEx) {
                    log.error("Failed to send unlock limit SMS to butcher: {}", smsEx.getMessage());
                    // Don't fail the unlock because of SMS error
                }
            }
        }

        return ButcherDto.from(butcher, true);
    }

    public Butcher updatePhoto(UUID butcherId, String photoUrl) {
        butcherRepo.updatePhoto(butcherId, photoUrl);
        return butcherRepo.findById(butcherId).orElseThrow();
    }

    public Butcher getCurrentButcher() {
        User currentUser = UserContext.require();
        return butcherRepo.findByUserId(currentUser.getId())
            .orElseThrow(() -> new RuntimeException("Butcher profile not found"));
    }

    @Transactional
    public Butcher updateProfile(String name, String whatsapp, String photoUrl,
                                  BigDecimal cowPrice, String cowPriceType,
                                  BigDecimal goatPrice, String goatPriceType,
                                  Integer cowCapacity, Integer goatCapacity,
                                  List<Integer> thanaIds) {
        User currentUser = UserContext.require();
        Butcher butcher = butcherRepo.findByUserId(currentUser.getId())
            .orElseThrow(() -> new RuntimeException("Butcher profile not found"));

        // Update user name if provided
        if (name != null && !name.isBlank()) {
            userRepo.updateName(currentUser.getId(), name);
        }

        // Update butcher profile
        Butcher.PriceType cowType = cowPriceType != null ? Butcher.PriceType.valueOf(cowPriceType) : null;
        Butcher.PriceType goatType = goatPriceType != null ? Butcher.PriceType.valueOf(goatPriceType) : null;

        butcherRepo.updateProfile(butcher.getId(), whatsapp, photoUrl,
            cowPrice, cowType, goatPrice, goatType, cowCapacity, goatCapacity);

        // Update thanas if provided
        if (thanaIds != null && !thanaIds.isEmpty()) {
            butcherRepo.clearThanas(butcher.getId());
            butcherRepo.assignThanas(butcher.getId(), thanaIds);
        }

        return butcherRepo.findById(butcher.getId()).orElseThrow();
    }

    // Availability methods
    public List<ButcherAvailability> getAvailability(UUID butcherId, LocalDate from, LocalDate to) {
        return butcherRepo.findAvailability(butcherId, from, to);
    }

    public List<ButcherAvailability> getMyAvailability(LocalDate from, LocalDate to) {
        Butcher butcher = getCurrentButcher();
        return butcherRepo.findAvailability(butcher.getId(), from, to);
    }

    @Transactional
    public void setAvailability(LocalDate date, ButcherAvailability.AvailabilityStatus status, String note) {
        Butcher butcher = getCurrentButcher();
        butcherRepo.setAvailability(butcher.getId(), date, status, note);
    }

    @Transactional
    public void deleteAvailability(LocalDate date) {
        Butcher butcher = getCurrentButcher();
        butcherRepo.deleteAvailability(butcher.getId(), date);
    }
}
