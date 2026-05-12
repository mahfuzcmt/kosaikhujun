package com.kosaibari.domain;

import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data
public class User {
    private UUID id;
    private String phone;
    private String name;
    private String passwordHash;
    private UserType userType;
    private boolean verified;
    private boolean active;
    private Instant lastLoginAt;
    private Instant createdAt;
    private Instant updatedAt;

    public boolean hasPassword() {
        return passwordHash != null && !passwordHash.isEmpty();
    }

    public enum UserType {
        BUTCHER, CUSTOMER, ADMIN
    }
}
