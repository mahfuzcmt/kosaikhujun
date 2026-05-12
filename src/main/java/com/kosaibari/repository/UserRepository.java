package com.kosaibari.repository;

import com.kosaibari.domain.User;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class UserRepository {

    private final JdbcTemplate jdbc;

    private static final RowMapper<User> ROW_MAPPER = (rs, rowNum) -> {
        User u = new User();
        u.setId(UUID.fromString(rs.getString("id")));
        u.setPhone(rs.getString("phone"));
        u.setName(rs.getString("name"));
        u.setPasswordHash(rs.getString("password_hash"));
        u.setUserType(User.UserType.valueOf(rs.getString("user_type")));
        u.setVerified(rs.getBoolean("is_verified"));
        u.setActive(rs.getBoolean("is_active"));
        Timestamp lastLogin = rs.getTimestamp("last_login_at");
        if (lastLogin != null) u.setLastLoginAt(lastLogin.toInstant());
        u.setCreatedAt(rs.getTimestamp("created_at").toInstant());
        u.setUpdatedAt(rs.getTimestamp("updated_at").toInstant());
        return u;
    };

    public Optional<User> findById(UUID id) {
        var list = jdbc.query(
            "SELECT * FROM users WHERE id = ?",
            ROW_MAPPER, id
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public Optional<User> findByPhone(String phone) {
        var list = jdbc.query(
            "SELECT * FROM users WHERE phone = ?",
            ROW_MAPPER, phone
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public User create(String phone, String name, User.UserType userType) {
        UUID id = UUID.randomUUID();
        jdbc.update(
            """
            INSERT INTO users (id, phone, name, user_type, is_verified, is_active)
            VALUES (?, ?, ?, ?, false, true)
            """,
            id, phone, name, userType.name()
        );
        return findById(id).orElseThrow();
    }

    public void markVerified(UUID id) {
        jdbc.update(
            "UPDATE users SET is_verified = true, updated_at = now() WHERE id = ?",
            id
        );
    }

    public void updateLastLogin(UUID id) {
        jdbc.update(
            "UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = ?",
            id
        );
    }

    public void updateName(UUID id, String name) {
        jdbc.update(
            "UPDATE users SET name = ?, updated_at = now() WHERE id = ?",
            name, id
        );
    }

    public int countByType(User.UserType type) {
        return jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE user_type = ?",
            Integer.class, type.name()
        );
    }

    public int countAll() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class);
    }

    public void updateVerified(UUID id, boolean verified) {
        jdbc.update(
            "UPDATE users SET is_verified = ?, updated_at = now() WHERE id = ?",
            verified, id
        );
    }

    public void updateUserType(UUID id, User.UserType userType) {
        jdbc.update(
            "UPDATE users SET user_type = ?, updated_at = now() WHERE id = ?",
            userType.name(), id
        );
    }

    public void updateActive(UUID id, boolean active) {
        jdbc.update(
            "UPDATE users SET is_active = ?, updated_at = now() WHERE id = ?",
            active, id
        );
    }

    public void delete(UUID id) {
        jdbc.update("DELETE FROM users WHERE id = ?", id);
    }

    public void updatePassword(UUID id, String passwordHash) {
        jdbc.update(
            "UPDATE users SET password_hash = ?, updated_at = now() WHERE id = ?",
            passwordHash, id
        );
    }

    public User createWithPassword(String phone, String name, String passwordHash, User.UserType userType) {
        UUID id = UUID.randomUUID();
        jdbc.update(
            """
            INSERT INTO users (id, phone, name, password_hash, user_type, is_verified, is_active)
            VALUES (?, ?, ?, ?, ?, true, true)
            """,
            id, phone, name, passwordHash, userType.name()
        );
        return findById(id).orElseThrow();
    }

    public List<User> findAll(User.UserType userType, int page, int limit) {
        StringBuilder sql = new StringBuilder("SELECT * FROM users WHERE 1=1");
        List<Object> params = new java.util.ArrayList<>();

        if (userType != null) {
            sql.append(" AND user_type = ?");
            params.add(userType.name());
        }

        sql.append(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
        params.add(limit);
        params.add(page * limit);

        return jdbc.query(sql.toString(), ROW_MAPPER, params.toArray());
    }
}
