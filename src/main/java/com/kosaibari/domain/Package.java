package com.kosaibari.domain;

import lombok.Data;
import java.time.Instant;

@Data
public class Package {
    private Integer id;
    private String name;
    private String nameBn;
    private String description;
    private String descriptionBn;
    private Integer contactLimit; // null = unlimited
    private Integer price;
    private boolean active;
    private Integer sortOrder;
    private Instant createdAt;
}
