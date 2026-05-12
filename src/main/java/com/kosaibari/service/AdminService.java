package com.kosaibari.service;

import com.kosaibari.domain.Butcher;
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
        int approvedButchers = butcherRepo.countApproved(null, null);
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
}
