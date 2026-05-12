package com.kosaibari.dto;

import com.kosaibari.domain.User;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    UserDto user,
    ProfileInfo profile,
    boolean isNewUser
) {
    public static AuthResponse of(String accessToken, String refreshToken, User user, Object profile, boolean isNew) {
        ProfileInfo profileInfo = null;
        if (profile != null) {
            if (profile instanceof com.kosaibari.domain.Butcher b) {
                profileInfo = new ProfileInfo("butcher", b.getId().toString(), b.getStatus().name());
            } else if (profile instanceof com.kosaibari.domain.Customer c) {
                profileInfo = new ProfileInfo("customer", c.getId().toString(), null);
            }
        }
        return new AuthResponse(accessToken, refreshToken, UserDto.from(user), profileInfo, isNew);
    }

    public record ProfileInfo(String type, String profileId, String status) {}
}
