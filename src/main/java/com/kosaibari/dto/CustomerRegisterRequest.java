package com.kosaibari.dto;

import java.util.List;

public record CustomerRegisterRequest(
    String name,
    String whatsapp,
    String address,
    Integer districtId,
    List<Integer> thanaIds
) {}
