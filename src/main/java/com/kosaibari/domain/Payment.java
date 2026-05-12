package com.kosaibari.domain;

import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data
public class Payment {
    private UUID id;
    private UUID userId;
    private UUID subscriptionId;
    private Integer packageId;
    private Integer amount;
    private PaymentMethod method;
    private String transactionId;
    private String bkashPaymentId;
    private PaymentStatus status;
    private Instant paidAt;
    private UUID verifiedBy;
    private Instant verifiedAt;
    private Instant createdAt;

    public enum PaymentMethod {
        BKASH, NAGAD, ROCKET
    }

    public enum PaymentStatus {
        PENDING, SUCCESS, FAILED, REFUNDED
    }
}
