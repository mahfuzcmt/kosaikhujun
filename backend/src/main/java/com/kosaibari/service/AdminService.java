package com.kosaibari.service;

import com.kosaibari.domain.Butcher;
import com.kosaibari.domain.ButcherAvailability;
import com.kosaibari.domain.User;
import com.kosaibari.repository.ButcherRepository;
import com.kosaibari.repository.CustomerRepository;
import com.kosaibari.repository.SubscriptionRepository;
import com.kosaibari.repository.UserRepository;
import com.kosaibari.security.UserContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepo;
    private final ButcherRepository butcherRepo;
    private final CustomerRepository customerRepo;
    private final SubscriptionRepository subscriptionRepo;

    public Map<String, Object> getStats() {
        int totalUsers = userRepo.countAll();
        int totalButchers = butcherRepo.countAll();
        int pendingButchers = butcherRepo.countPending();
        int approvedButchers = butcherRepo.countApproved(null, null, null);
        int totalCustomers = customerRepo.countAll();
        int paidCustomers = subscriptionRepo.countPaidCustomers();

        return Map.of(
            "totalUsers", totalUsers,
            "totalButchers", totalButchers,
            "pendingButchers", pendingButchers,
            "approvedButchers", approvedButchers,
            "totalCustomers", totalCustomers,
            "paidCustomers", paidCustomers,
            "unpaidCustomers", totalCustomers - paidCustomers
        );
    }

    public List<User> getUsers(String type, int page, int limit) {
        User.UserType userType = type != null ? User.UserType.valueOf(type.toUpperCase()) : null;
        return userRepo.findAll(userType, page, limit);
    }

    public List<Butcher> getPendingButchers() {
        return butcherRepo.findPending();
    }

    @Transactional
    public Butcher approveButcher(UUID butcherId) {
        User admin = UserContext.require();
        butcherRepo.updateStatus(butcherId, Butcher.ButcherStatus.APPROVED, admin.getId());
        return butcherRepo.findById(butcherId).orElseThrow();
    }

    @Transactional
    public Butcher blockButcher(UUID butcherId) {
        User admin = UserContext.require();
        butcherRepo.updateStatus(butcherId, Butcher.ButcherStatus.BLOCKED, admin.getId());
        return butcherRepo.findById(butcherId).orElseThrow();
    }

    @Transactional
    public void deleteUser(UUID userId) {
        userRepo.delete(userId);
    }

    @Transactional
    public void toggleUserActive(UUID userId, boolean active) {
        userRepo.updateActive(userId, active);
    }

    // Availability management for any butcher (admin override).
    // The admin UI navigates by user_id (since /admin/users lists users), so we resolve
    // to the butcher profile here. users.id ↔ butchers.user_id is 1:1.
    private Butcher requireButcherForUser(UUID userId) {
        return butcherRepo.findByUserId(userId)
            .orElseThrow(() -> new RuntimeException("Butcher profile not found for user"));
    }

    public Butcher getButcherForUser(UUID userId) {
        return requireButcherForUser(userId);
    }

    public List<ButcherAvailability> getButcherAvailabilityByUser(UUID userId, LocalDate from, LocalDate to) {
        Butcher butcher = requireButcherForUser(userId);
        return butcherRepo.findAvailability(butcher.getId(), from, to);
    }

    @Transactional
    public void setButcherAvailabilityByUser(UUID userId, LocalDate date,
                                              ButcherAvailability.AvailabilityStatus status, String note) {
        Butcher butcher = requireButcherForUser(userId);
        butcherRepo.setAvailability(butcher.getId(), date, status, note);
    }

    @Transactional
    public void deleteButcherAvailabilityByUser(UUID userId, LocalDate date) {
        Butcher butcher = requireButcherForUser(userId);
        butcherRepo.deleteAvailability(butcher.getId(), date);
    }
}
