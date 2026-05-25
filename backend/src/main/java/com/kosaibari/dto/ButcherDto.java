package com.kosaibari.dto;

import com.kosaibari.domain.Butcher;
import com.kosaibari.domain.Thana;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record ButcherDto(
    UUID id,
    String name,
    String photoUrl,
    BigDecimal cowPrice,
    String cowPriceType,
    BigDecimal goatPrice,
    String goatPriceType,
    Integer cowCapacity,
    Integer goatCapacity,
    BigDecimal rating,
    Integer totalReviews,
    String status,
    List<ThanaDto> thanas,
    // Contact info - only visible if unlocked
    String phone,
    String whatsapp,
    boolean contactUnlocked,
    // Unlock tracking
    Integer unlockCount,
    Integer unlockLimit
) {
    public static ButcherDto from(Butcher butcher, boolean contactUnlocked) {
        return new ButcherDto(
            butcher.getId(),
            butcher.getUser() != null ? butcher.getUser().getName() : null,
            butcher.getPhotoUrl(),
            butcher.getCowPrice(),
            butcher.getCowPriceType() != null ? butcher.getCowPriceType().name() : "PER_ANIMAL",
            butcher.getGoatPrice(),
            butcher.getGoatPriceType() != null ? butcher.getGoatPriceType().name() : "PER_ANIMAL",
            butcher.getCowCapacity(),
            butcher.getGoatCapacity(),
            butcher.getRating(),
            butcher.getTotalReviews(),
            butcher.getStatus().name(),
            butcher.getThanas() != null ? butcher.getThanas().stream().map(ThanaDto::from).toList() : null,
            contactUnlocked && butcher.getUser() != null ? butcher.getUser().getPhone() : null,
            contactUnlocked ? butcher.getWhatsapp() : null,
            contactUnlocked,
            butcher.getUnlockCount(),
            butcher.getUnlockLimit()
        );
    }

    public record ThanaDto(int id, String nameBn, String nameEn, int districtId) {
        public static ThanaDto from(Thana thana) {
            return new ThanaDto(thana.getId(), thana.getNameBn(), thana.getNameEn(), thana.getDistrictId());
        }
    }
}
