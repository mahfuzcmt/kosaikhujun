package com.kosaibari.dto;

import com.kosaibari.domain.Package;

public record PackageDto(
    int id,
    String name,
    String nameBn,
    String description,
    String descriptionBn,
    Integer contactLimit,
    int price,
    boolean isActive
) {
    public static PackageDto from(Package pkg) {
        return new PackageDto(
            pkg.getId(),
            pkg.getName(),
            pkg.getNameBn(),
            pkg.getDescription(),
            pkg.getDescriptionBn(),
            pkg.getContactLimit(),
            pkg.getPrice(),
            pkg.isActive()
        );
    }
}
