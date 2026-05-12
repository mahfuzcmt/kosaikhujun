package com.kosaibari.dto;

public record AuthRequest(
    String phone,
    String code
) {}
