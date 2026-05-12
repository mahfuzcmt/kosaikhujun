package com.kosaibari.domain;

import lombok.Data;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ButcherAvailability {
    private UUID id;
    private UUID butcherId;
    private LocalDate date;
    private AvailabilityStatus status;
    private String note;
    private Instant createdAt;
    private Instant updatedAt;

    public enum AvailabilityStatus {
        AVAILABLE,
        BOOKED,
        UNAVAILABLE
    }
}
