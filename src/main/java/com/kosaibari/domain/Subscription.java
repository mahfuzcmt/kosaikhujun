package com.kosaibari.domain;

import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data
public class Subscription {
    private UUID id;
    private UUID customerId;
    private Integer packageId;
    private Integer contactsUsed;
    private Instant purchasedAt;
    private Instant expiresAt;
    private SubscriptionStatus status;

    // Joined
    private Package pkg;

    public enum SubscriptionStatus {
        ACTIVE, EXPIRED, CANCELLED
    }

    public boolean hasRemainingContacts() {
        if (pkg == null || pkg.getContactLimit() == null) {
            return true; // unlimited
        }
        return contactsUsed < pkg.getContactLimit();
    }
}
