package com.kosaibari.dto;

import com.kosaibari.domain.Subscription;
import java.time.Instant;
import java.util.UUID;

public record SubscriptionDto(
    UUID id,
    PackageDto pkg,
    int contactsUsed,
    Integer contactLimit,
    int contactsRemaining,
    String status,
    Instant purchasedAt,
    Instant expiresAt
) {
    public static SubscriptionDto from(Subscription sub) {
        Integer limit = sub.getPkg() != null ? sub.getPkg().getContactLimit() : null;
        int remaining = limit == null ? -1 : Math.max(0, limit - sub.getContactsUsed());
        return new SubscriptionDto(
            sub.getId(),
            sub.getPkg() != null ? PackageDto.from(sub.getPkg()) : null,
            sub.getContactsUsed(),
            limit,
            remaining,
            sub.getStatus().name(),
            sub.getPurchasedAt(),
            sub.getExpiresAt()
        );
    }
}
