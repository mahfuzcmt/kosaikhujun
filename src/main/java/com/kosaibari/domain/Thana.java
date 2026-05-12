package com.kosaibari.domain;

import lombok.Data;
import java.time.Instant;

@Data
public class Thana {
    private Integer id;
    private Integer districtId;
    private String nameBn;
    private String nameEn;
    private boolean active;
    private Instant createdAt;

    // Joined
    private District district;
}
