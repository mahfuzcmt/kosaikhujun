package com.kosaibari.domain;

import lombok.Data;
import java.time.Instant;

@Data
public class AppSettings {
    private Integer id;
    private String settingKey;
    private String settingValue;
    private String description;
    private Instant createdAt;
    private Instant updatedAt;
}
