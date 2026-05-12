package com.kosaibari.security;

import com.kosaibari.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long accessTtlMinutes;
    private final long refreshTtlDays;

    public JwtService(
            @Value("${kosaibari.jwt.secret}") String secret,
            @Value("${kosaibari.jwt.access-ttl-minutes}") long accessTtlMinutes,
            @Value("${kosaibari.jwt.refresh-ttl-days}") long refreshTtlDays) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTtlMinutes = accessTtlMinutes;
        this.refreshTtlDays = refreshTtlDays;
    }

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("phone", user.getPhone())
                .claim("type", user.getUserType().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTtlMinutes, ChronoUnit.MINUTES)))
                .signWith(secretKey)
                .compact();
    }

    public String generateRefreshToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("refresh", true)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(refreshTtlDays, ChronoUnit.DAYS)))
                .signWith(secretKey)
                .compact();
    }

    public Optional<Claims> parseToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(claims);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public Optional<UUID> extractUserId(String token) {
        return parseToken(token)
                .map(claims -> UUID.fromString(claims.getSubject()));
    }

    public Optional<User.UserType> extractUserType(String token) {
        return parseToken(token)
                .map(claims -> {
                    String type = claims.get("type", String.class);
                    return type != null ? User.UserType.valueOf(type) : null;
                });
    }

    public boolean isRefreshToken(String token) {
        return parseToken(token)
                .map(claims -> Boolean.TRUE.equals(claims.get("refresh", Boolean.class)))
                .orElse(false);
    }
}
