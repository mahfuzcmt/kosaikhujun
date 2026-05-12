package com.kosaibari.dto;

import java.util.List;

public record ButcherRegisterRequest(
    String name,
    String whatsapp,
    List<Integer> thanaIds,
    Integer cowPrice,
    String cowPriceType,  // PER_ANIMAL or PER_KG
    Integer goatPrice,
    String goatPriceType, // PER_ANIMAL or PER_KG
    Integer cowCapacity,
    Integer goatCapacity
) {}
