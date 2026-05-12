package com.kosaibari.repository;

import com.kosaibari.domain.Butcher;
import com.kosaibari.domain.ButcherAvailability;
import com.kosaibari.domain.Thana;
import com.kosaibari.domain.User;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.*;

@Repository
@RequiredArgsConstructor
public class ButcherRepository {

    private final JdbcTemplate jdbc;

    private static final RowMapper<Butcher> ROW_MAPPER = (rs, rowNum) -> {
        Butcher b = new Butcher();
        b.setId(UUID.fromString(rs.getString("id")));
        b.setUserId(UUID.fromString(rs.getString("user_id")));
        b.setWhatsapp(rs.getString("whatsapp"));
        b.setPhotoUrl(rs.getString("photo_url"));
        b.setCowPrice(rs.getObject("cow_price", Integer.class));
        String cowPriceType = rs.getString("cow_price_type");
        if (cowPriceType != null) b.setCowPriceType(Butcher.PriceType.valueOf(cowPriceType));
        b.setGoatPrice(rs.getObject("goat_price", Integer.class));
        String goatPriceType = rs.getString("goat_price_type");
        if (goatPriceType != null) b.setGoatPriceType(Butcher.PriceType.valueOf(goatPriceType));
        b.setCowCapacity(rs.getObject("cow_capacity", Integer.class));
        b.setGoatCapacity(rs.getObject("goat_capacity", Integer.class));
        b.setRating(rs.getBigDecimal("rating"));
        b.setTotalReviews(rs.getInt("total_reviews"));
        b.setStatus(Butcher.ButcherStatus.valueOf(rs.getString("status")));
        Timestamp approvedAt = rs.getTimestamp("approved_at");
        if (approvedAt != null) b.setApprovedAt(approvedAt.toInstant());
        String approvedBy = rs.getString("approved_by");
        if (approvedBy != null) b.setApprovedBy(UUID.fromString(approvedBy));
        b.setCreatedAt(rs.getTimestamp("created_at").toInstant());
        b.setUpdatedAt(rs.getTimestamp("updated_at").toInstant());
        b.setUnlockLimit(rs.getObject("unlock_limit", Integer.class));
        return b;
    };

    private static final RowMapper<Butcher> ROW_MAPPER_WITH_USER = (rs, rowNum) -> {
        Butcher b = ROW_MAPPER.mapRow(rs, rowNum);
        User u = new User();
        u.setId(UUID.fromString(rs.getString("user_id")));
        u.setPhone(rs.getString("phone"));
        u.setName(rs.getString("name"));
        u.setUserType(User.UserType.BUTCHER);
        b.setUser(u);
        return b;
    };

    private static final RowMapper<Butcher> ROW_MAPPER_WITH_USER_AND_COUNT = (rs, rowNum) -> {
        Butcher b = ROW_MAPPER_WITH_USER.mapRow(rs, rowNum);
        b.setUnlockCount(rs.getInt("unlock_count"));
        return b;
    };

    public Optional<Butcher> findById(UUID id) {
        var list = jdbc.query(
            """
            SELECT b.*, u.phone, u.name,
                   (SELECT COUNT(*) FROM unlocked_contacts uc WHERE uc.butcher_id = b.id) as unlock_count
            FROM butchers b
            JOIN users u ON u.id = b.user_id
            WHERE b.id = ?
            """,
            ROW_MAPPER_WITH_USER_AND_COUNT, id
        );
        if (list.isEmpty()) return Optional.empty();
        Butcher b = list.get(0);
        b.setThanas(findThanas(b.getId()));
        return Optional.of(b);
    }

    public Optional<Butcher> findByUserId(UUID userId) {
        var list = jdbc.query(
            """
            SELECT b.*, u.phone, u.name,
                   (SELECT COUNT(*) FROM unlocked_contacts uc WHERE uc.butcher_id = b.id) as unlock_count
            FROM butchers b
            JOIN users u ON u.id = b.user_id
            WHERE b.user_id = ?
            """,
            ROW_MAPPER_WITH_USER_AND_COUNT, userId
        );
        if (list.isEmpty()) return Optional.empty();
        Butcher b = list.get(0);
        b.setThanas(findThanas(b.getId()));
        return Optional.of(b);
    }

    public List<Butcher> findApproved(Integer districtId, Integer thanaId, int offset, int limit) {
        StringBuilder sql = new StringBuilder("""
            SELECT DISTINCT b.*, u.phone, u.name,
                   (SELECT COUNT(*) FROM unlocked_contacts uc WHERE uc.butcher_id = b.id) as unlock_count,
                   (COALESCE(b.unlock_limit, 999999) - (SELECT COUNT(*) FROM unlocked_contacts uc WHERE uc.butcher_id = b.id)) as remaining_slots
            FROM butchers b
            JOIN users u ON u.id = b.user_id
            JOIN butcher_thanas bt ON bt.butcher_id = b.id
            JOIN thanas t ON t.id = bt.thana_id
            WHERE b.status = 'APPROVED' AND u.is_active = true
            AND (
                -- Include if no availability records exist (default = available)
                NOT EXISTS (
                    SELECT 1 FROM butcher_availability ba
                    WHERE ba.butcher_id = b.id
                    AND ba.date >= CURRENT_DATE
                    AND ba.date <= CURRENT_DATE + INTERVAL '14 days'
                )
                OR
                -- Include if at least one day is AVAILABLE in next 14 days
                EXISTS (
                    SELECT 1 FROM butcher_availability ba
                    WHERE ba.butcher_id = b.id
                    AND ba.date >= CURRENT_DATE
                    AND ba.date <= CURRENT_DATE + INTERVAL '14 days'
                    AND ba.status = 'AVAILABLE'
                )
            )
            -- Exclude butchers who have reached their unlock limit
            AND (b.unlock_limit IS NULL OR (SELECT COUNT(*) FROM unlocked_contacts uc WHERE uc.butcher_id = b.id) < b.unlock_limit)
            """);

        List<Object> params = new ArrayList<>();
        if (districtId != null) {
            sql.append(" AND t.district_id = ?");
            params.add(districtId);
        }
        if (thanaId != null) {
            sql.append(" AND bt.thana_id = ?");
            params.add(thanaId);
        }
        // Sort by remaining slots DESC (more remaining capacity first), then by rating DESC
        sql.append(" ORDER BY remaining_slots DESC, b.rating DESC, b.created_at DESC LIMIT ? OFFSET ?");
        params.add(limit);
        params.add(offset);

        List<Butcher> butchers = jdbc.query(sql.toString(), ROW_MAPPER_WITH_USER_AND_COUNT, params.toArray());
        for (Butcher b : butchers) {
            b.setThanas(findThanas(b.getId()));
        }
        return butchers;
    }

    public int countApproved(Integer districtId, Integer thanaId) {
        StringBuilder sql = new StringBuilder("""
            SELECT COUNT(DISTINCT b.id)
            FROM butchers b
            JOIN users u ON u.id = b.user_id
            JOIN butcher_thanas bt ON bt.butcher_id = b.id
            JOIN thanas t ON t.id = bt.thana_id
            WHERE b.status = 'APPROVED' AND u.is_active = true
            AND (
                -- Include if no availability records exist (default = available)
                NOT EXISTS (
                    SELECT 1 FROM butcher_availability ba
                    WHERE ba.butcher_id = b.id
                    AND ba.date >= CURRENT_DATE
                    AND ba.date <= CURRENT_DATE + INTERVAL '14 days'
                )
                OR
                -- Include if at least one day is AVAILABLE in next 14 days
                EXISTS (
                    SELECT 1 FROM butcher_availability ba
                    WHERE ba.butcher_id = b.id
                    AND ba.date >= CURRENT_DATE
                    AND ba.date <= CURRENT_DATE + INTERVAL '14 days'
                    AND ba.status = 'AVAILABLE'
                )
            )
            -- Exclude butchers who have reached their unlock limit
            AND (b.unlock_limit IS NULL OR (SELECT COUNT(*) FROM unlocked_contacts uc WHERE uc.butcher_id = b.id) < b.unlock_limit)
            """);

        List<Object> params = new ArrayList<>();
        if (districtId != null) {
            sql.append(" AND t.district_id = ?");
            params.add(districtId);
        }
        if (thanaId != null) {
            sql.append(" AND bt.thana_id = ?");
            params.add(thanaId);
        }
        return jdbc.queryForObject(sql.toString(), Integer.class, params.toArray());
    }

    public List<Butcher> findPending() {
        List<Butcher> butchers = jdbc.query(
            """
            SELECT b.*, u.phone, u.name,
                   (SELECT COUNT(*) FROM unlocked_contacts uc WHERE uc.butcher_id = b.id) as unlock_count
            FROM butchers b
            JOIN users u ON u.id = b.user_id
            WHERE b.status = 'PENDING'
            ORDER BY b.created_at ASC
            """,
            ROW_MAPPER_WITH_USER_AND_COUNT
        );
        for (Butcher b : butchers) {
            b.setThanas(findThanas(b.getId()));
        }
        return butchers;
    }

    public Butcher create(UUID userId, String whatsapp, String photoUrl,
                          Integer cowPrice, Integer goatPrice,
                          Integer cowCapacity, Integer goatCapacity,
                          List<Integer> thanaIds) {
        UUID id = UUID.randomUUID();
        jdbc.update(
            """
            INSERT INTO butchers (id, user_id, whatsapp, photo_url, cow_price, goat_price, cow_capacity, goat_capacity, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
            """,
            id, userId, whatsapp, photoUrl, cowPrice, goatPrice, cowCapacity, goatCapacity
        );

        for (Integer thanaId : thanaIds) {
            jdbc.update(
                "INSERT INTO butcher_thanas (butcher_id, thana_id) VALUES (?, ?)",
                id, thanaId
            );
        }

        return findById(id).orElseThrow();
    }

    public Butcher create(UUID userId, String whatsapp,
                          Integer cowPrice, Integer goatPrice,
                          Integer cowCapacity, Integer goatCapacity) {
        return create(userId, whatsapp, cowPrice, Butcher.PriceType.PER_ANIMAL,
                      goatPrice, Butcher.PriceType.PER_ANIMAL, cowCapacity, goatCapacity);
    }

    public Butcher create(UUID userId, String whatsapp,
                          Integer cowPrice, Butcher.PriceType cowPriceType,
                          Integer goatPrice, Butcher.PriceType goatPriceType,
                          Integer cowCapacity, Integer goatCapacity) {
        UUID id = UUID.randomUUID();
        jdbc.update(
            """
            INSERT INTO butchers (id, user_id, whatsapp, cow_price, cow_price_type, goat_price, goat_price_type, cow_capacity, goat_capacity, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
            """,
            id, userId, whatsapp, cowPrice, cowPriceType.name(), goatPrice, goatPriceType.name(), cowCapacity, goatCapacity
        );
        return findById(id).orElseThrow();
    }

    public void assignThanas(UUID butcherId, List<Integer> thanaIds) {
        for (Integer thanaId : thanaIds) {
            jdbc.update(
                "INSERT INTO butcher_thanas (butcher_id, thana_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                butcherId, thanaId
            );
        }
    }

    public void updateStatus(UUID id, Butcher.ButcherStatus status, UUID approvedBy) {
        if (status == Butcher.ButcherStatus.APPROVED) {
            jdbc.update(
                """
                UPDATE butchers SET status = ?, approved_at = now(), approved_by = ?, updated_at = now()
                WHERE id = ?
                """,
                status.name(), approvedBy, id
            );
        } else {
            jdbc.update(
                "UPDATE butchers SET status = ?, updated_at = now() WHERE id = ?",
                status.name(), id
            );
        }
    }

    public void updatePhoto(UUID id, String photoUrl) {
        jdbc.update(
            "UPDATE butchers SET photo_url = ?, updated_at = now() WHERE id = ?",
            photoUrl, id
        );
    }

    public int countPending() {
        return jdbc.queryForObject(
            "SELECT COUNT(*) FROM butchers WHERE status = 'PENDING'",
            Integer.class
        );
    }

    public int countAll() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM butchers", Integer.class);
    }

    public void approve(UUID id, UUID approvedBy) {
        jdbc.update(
            """
            UPDATE butchers SET status = 'APPROVED', approved_at = now(), approved_by = ?, updated_at = now()
            WHERE id = ?
            """,
            approvedBy, id
        );
    }

    public void block(UUID id) {
        jdbc.update(
            "UPDATE butchers SET status = 'BLOCKED', updated_at = now() WHERE id = ?",
            id
        );
    }

    public int countByStatus(Butcher.ButcherStatus status) {
        return jdbc.queryForObject(
            "SELECT COUNT(*) FROM butchers WHERE status = ?",
            Integer.class, status.name()
        );
    }

    private List<Thana> findThanas(UUID butcherId) {
        return jdbc.query(
            """
            SELECT t.* FROM thanas t
            JOIN butcher_thanas bt ON bt.thana_id = t.id
            WHERE bt.butcher_id = ?
            """,
            (rs, rowNum) -> {
                Thana t = new Thana();
                t.setId(rs.getInt("id"));
                t.setDistrictId(rs.getInt("district_id"));
                t.setNameBn(rs.getString("name_bn"));
                t.setNameEn(rs.getString("name_en"));
                t.setActive(rs.getBoolean("is_active"));
                return t;
            },
            butcherId
        );
    }

    public void updateProfile(UUID butcherId, String whatsapp, String photoUrl,
                              Integer cowPrice, Butcher.PriceType cowPriceType,
                              Integer goatPrice, Butcher.PriceType goatPriceType,
                              Integer cowCapacity, Integer goatCapacity) {
        jdbc.update(
            """
            UPDATE butchers SET
                whatsapp = COALESCE(?, whatsapp),
                photo_url = COALESCE(?, photo_url),
                cow_price = COALESCE(?, cow_price),
                cow_price_type = COALESCE(?, cow_price_type),
                goat_price = COALESCE(?, goat_price),
                goat_price_type = COALESCE(?, goat_price_type),
                cow_capacity = COALESCE(?, cow_capacity),
                goat_capacity = COALESCE(?, goat_capacity),
                updated_at = now()
            WHERE id = ?
            """,
            whatsapp, photoUrl,
            cowPrice, cowPriceType != null ? cowPriceType.name() : null,
            goatPrice, goatPriceType != null ? goatPriceType.name() : null,
            cowCapacity, goatCapacity, butcherId
        );
    }

    public void clearThanas(UUID butcherId) {
        jdbc.update("DELETE FROM butcher_thanas WHERE butcher_id = ?", butcherId);
    }

    // Availability methods
    public List<ButcherAvailability> findAvailability(UUID butcherId, java.time.LocalDate fromDate, java.time.LocalDate toDate) {
        return jdbc.query(
            """
            SELECT * FROM butcher_availability
            WHERE butcher_id = ? AND date >= ? AND date <= ?
            ORDER BY date
            """,
            (rs, rowNum) -> {
                ButcherAvailability a = new ButcherAvailability();
                a.setId(UUID.fromString(rs.getString("id")));
                a.setButcherId(UUID.fromString(rs.getString("butcher_id")));
                a.setDate(rs.getDate("date").toLocalDate());
                a.setStatus(ButcherAvailability.AvailabilityStatus.valueOf(rs.getString("status")));
                a.setNote(rs.getString("note"));
                a.setCreatedAt(rs.getTimestamp("created_at").toInstant());
                a.setUpdatedAt(rs.getTimestamp("updated_at").toInstant());
                return a;
            },
            butcherId, fromDate, toDate
        );
    }

    public void setAvailability(UUID butcherId, java.time.LocalDate date,
                                 ButcherAvailability.AvailabilityStatus status, String note) {
        jdbc.update(
            """
            INSERT INTO butcher_availability (butcher_id, date, status, note)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (butcher_id, date)
            DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, updated_at = now()
            """,
            butcherId, date, status.name(), note
        );
    }

    public void deleteAvailability(UUID butcherId, java.time.LocalDate date) {
        jdbc.update(
            "DELETE FROM butcher_availability WHERE butcher_id = ? AND date = ?",
            butcherId, date
        );
    }
}
