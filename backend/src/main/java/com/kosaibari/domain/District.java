package com.kosaibari.domain;

import lombok.Data;
import java.time.Instant;

@Data
public class District {
    private Integer id;
    private String nameBn;
    private String nameEn;
    private boolean active;
    private Instant createdAt;
}
