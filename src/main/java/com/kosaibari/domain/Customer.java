package com.kosaibari.domain;

import lombok.Data;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
public class Customer {
    private UUID id;
    private UUID userId;
    private String whatsapp;
    private String address;
    private Integer districtId;
    private Instant createdAt;
    private Instant updatedAt;

    // Joined fields
    private User user;
    private District district;
    private List<Thana> thanas;
}
