package com.kosaibari.dto;

import com.kosaibari.domain.User;
import java.time.Instant;
import java.util.UUID;

public record UserDto(
    UUID id,
    String phone,
    String name,
    String userType,
    boolean verified,
    Instant createdAt
) {
    public static UserDto from(User user) {
        return new UserDto(
            user.getId(),
            user.getPhone(),
            user.getName(),
            user.getUserType().name(),
            user.isVerified(),
            user.getCreatedAt()
        );
    }
}
