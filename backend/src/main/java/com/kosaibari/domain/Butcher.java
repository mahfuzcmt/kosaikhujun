package com.kosaibari.domain;

import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
public class Butcher {
    private UUID id;
    private UUID userId;
    private String whatsapp;
    private String photoUrl;
    private BigDecimal cowPrice;
    private PriceType cowPriceType;
    private BigDecimal goatPrice;
    private PriceType goatPriceType;
    private Integer cowCapacity;
    private Integer goatCapacity;
    private BigDecimal rating;
    private Integer totalReviews;
    private ButcherStatus status;
    private Instant approvedAt;
    private UUID approvedBy;
    private Instant createdAt;
    private Instant updatedAt;
    private Integer unlockLimit;

    // Joined/computed fields
    private User user;
    private List<Thana> thanas;
    private Integer unlockCount; // Number of customers who unlocked this butcher

    public enum ButcherStatus {
        PENDING, APPROVED, BLOCKED
    }

    public enum PriceType {
        PER_ANIMAL,  // Fixed price per animal processing
        PER_KG,      // Price per kg of meat
        PERCENTAGE   // Percentage of animal price
    }
}
