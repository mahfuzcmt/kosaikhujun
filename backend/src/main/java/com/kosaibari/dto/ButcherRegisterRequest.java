package com.kosaibari.dto;

import java.math.BigDecimal;
import java.util.List;

public record ButcherRegisterRequest(
    String name,
    String whatsapp,
    List<Integer> thanaIds,
    BigDecimal cowPrice,
    String cowPriceType,  // PER_ANIMAL, PER_KG or PERCENTAGE
    BigDecimal goatPrice,
    String goatPriceType, // PER_ANIMAL, PER_KG or PERCENTAGE
    Integer cowCapacity,
    Integer goatCapacity
) {}
