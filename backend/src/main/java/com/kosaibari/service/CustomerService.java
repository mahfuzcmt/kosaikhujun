package com.kosaibari.service;

import com.kosaibari.domain.Customer;
import com.kosaibari.domain.Subscription;
import com.kosaibari.domain.User;
import com.kosaibari.dto.ButcherDto;
import com.kosaibari.dto.CustomerRegisterRequest;
import com.kosaibari.dto.SubscriptionDto;
import com.kosaibari.repository.ButcherRepository;
import com.kosaibari.repository.CustomerRepository;
import com.kosaibari.repository.SubscriptionRepository;
import com.kosaibari.repository.UserRepository;
import com.kosaibari.security.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerService {

    private final CustomerRepository customerRepo;
    private final UserRepository userRepo;
    private final SubscriptionRepository subscriptionRepo;
    private final ButcherRepository butcherRepo;

    @Transactional
    public Customer register(CustomerRegisterRequest req) {
        User currentUser = UserContext.require();

        // Update user info
        userRepo.updateName(currentUser.getId(), req.name());
        userRepo.updateUserType(currentUser.getId(), User.UserType.CUSTOMER);

        // Create customer profile
        Customer customer = customerRepo.create(
            currentUser.getId(),
            req.whatsapp(),
            req.address(),
            req.districtId()
        );

        // Assign preferred thanas
        if (req.thanaIds() != null && !req.thanaIds().isEmpty()) {
            customerRepo.assignThanas(customer.getId(), req.thanaIds());
        }

        return customerRepo.findById(customer.getId()).orElse(customer);
    }

    public Customer getCurrentCustomer() {
        User currentUser = UserContext.require();
        return customerRepo.findByUserId(currentUser.getId())
            .orElseThrow(() -> new RuntimeException("Customer profile not found"));
    }

    /**
     * Get or create customer profile for the current user.
     * Used for operations like purchasing that should auto-create profile.
     */
    @Transactional
    public Customer getOrCreateCustomer() {
        User currentUser = UserContext.require();
        return customerRepo.findByUserId(currentUser.getId())
            .orElseGet(() -> {
                log.info("Auto-creating customer profile for user: {}", currentUser.getId());
                // Update user type if not already customer
                if (currentUser.getUserType() != User.UserType.CUSTOMER) {
                    userRepo.updateUserType(currentUser.getId(), User.UserType.CUSTOMER);
                }
                // Create minimal customer profile
                return customerRepo.create(
                    currentUser.getId(),
                    currentUser.getPhone(), // Use phone as default whatsapp
                    null, // No address
                    null  // No district
                );
            });
    }

    public SubscriptionDto getCurrentSubscription() {
        Customer customer = getCurrentCustomer();
        return subscriptionRepo.findActiveByCustomer(customer.getId())
            .map(SubscriptionDto::from)
            .orElse(null);
    }

    public List<SubscriptionDto> getAllSubscriptions() {
        Customer customer = getCurrentCustomer();
        return subscriptionRepo.findAllByCustomer(customer.getId()).stream()
            .map(SubscriptionDto::from)
            .toList();
    }

    public List<ButcherDto> getUnlockedButchers() {
        Customer customer = getCurrentCustomer();
        List<UUID> butcherIds = subscriptionRepo.findUnlockedButcherIds(customer.getId());

        return butcherIds.stream()
            .map(id -> butcherRepo.findById(id).orElse(null))
            .filter(b -> b != null)
            .map(b -> ButcherDto.from(b, true))
            .toList();
    }

    public List<ButcherDto> getFavorites() {
        Customer customer = getCurrentCustomer();
        return customerRepo.findFavoriteButchers(customer.getId()).stream()
            .map(b -> {
                boolean unlocked = subscriptionRepo.hasUnlockedContact(customer.getId(), b.getId());
                return ButcherDto.from(b, unlocked);
            })
            .toList();
    }

    @Transactional
    public void addFavorite(UUID butcherId) {
        Customer customer = getCurrentCustomer();
        customerRepo.addFavorite(customer.getId(), butcherId);
    }

    @Transactional
    public void removeFavorite(UUID butcherId) {
        Customer customer = getCurrentCustomer();
        customerRepo.removeFavorite(customer.getId(), butcherId);
    }

    @Transactional
    public Subscription purchasePackage(int packageId) {
        // Get or create customer profile - auto-creates if doesn't exist
        Customer customer = getOrCreateCustomer();

        // Allow buying multiple packages - contact limits stack
        // Create new subscription
        return subscriptionRepo.create(customer.getId(), packageId);
    }
}
