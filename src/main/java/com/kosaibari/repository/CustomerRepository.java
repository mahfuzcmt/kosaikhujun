package com.kosaibari.repository;

import com.kosaibari.domain.Customer;
import com.kosaibari.domain.Thana;
import com.kosaibari.domain.User;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
@RequiredArgsConstructor
public class CustomerRepository {

    private final JdbcTemplate jdbc;

    private static final RowMapper<Customer> ROW_MAPPER = (rs, rowNum) -> {
        Customer c = new Customer();
        c.setId(UUID.fromString(rs.getString("id")));
        c.setUserId(UUID.fromString(rs.getString("user_id")));
        c.setWhatsapp(rs.getString("whatsapp"));
        c.setAddress(rs.getString("address"));
        c.setDistrictId(rs.getObject("district_id", Integer.class));
        c.setCreatedAt(rs.getTimestamp("created_at").toInstant());
        c.setUpdatedAt(rs.getTimestamp("updated_at").toInstant());
        return c;
    };

    private static final RowMapper<Customer> ROW_MAPPER_WITH_USER = (rs, rowNum) -> {
        Customer c = ROW_MAPPER.mapRow(rs, rowNum);
        User u = new User();
        u.setId(UUID.fromString(rs.getString("user_id")));
        u.setPhone(rs.getString("phone"));
        u.setName(rs.getString("name"));
        u.setUserType(User.UserType.CUSTOMER);
        c.setUser(u);
        return c;
    };

    public Optional<Customer> findById(UUID id) {
        var list = jdbc.query(
            """
            SELECT c.*, u.phone, u.name
            FROM customers c
            JOIN users u ON u.id = c.user_id
            WHERE c.id = ?
            """,
            ROW_MAPPER_WITH_USER, id
        );
        if (list.isEmpty()) return Optional.empty();
        Customer c = list.get(0);
        c.setThanas(findThanas(c.getId()));
        return Optional.of(c);
    }

    public Optional<Customer> findByUserId(UUID userId) {
        var list = jdbc.query(
            """
            SELECT c.*, u.phone, u.name
            FROM customers c
            JOIN users u ON u.id = c.user_id
            WHERE c.user_id = ?
            """,
            ROW_MAPPER_WITH_USER, userId
        );
        if (list.isEmpty()) return Optional.empty();
        Customer c = list.get(0);
        c.setThanas(findThanas(c.getId()));
        return Optional.of(c);
    }

    public Customer create(UUID userId, String whatsapp, String address,
                           Integer districtId, List<Integer> thanaIds) {
        UUID id = UUID.randomUUID();
        jdbc.update(
            """
            INSERT INTO customers (id, user_id, whatsapp, address, district_id)
            VALUES (?, ?, ?, ?, ?)
            """,
            id, userId, whatsapp, address, districtId
        );

        if (thanaIds != null) {
            for (Integer thanaId : thanaIds) {
                jdbc.update(
                    "INSERT INTO customer_thanas (customer_id, thana_id) VALUES (?, ?)",
                    id, thanaId
                );
            }
        }

        return findById(id).orElseThrow();
    }

    public Customer create(UUID userId, String whatsapp, String address, Integer districtId) {
        UUID id = UUID.randomUUID();
        jdbc.update(
            """
            INSERT INTO customers (id, user_id, whatsapp, address, district_id)
            VALUES (?, ?, ?, ?, ?)
            """,
            id, userId, whatsapp, address, districtId
        );
        return findById(id).orElseThrow();
    }

    public void assignThanas(UUID customerId, List<Integer> thanaIds) {
        for (Integer thanaId : thanaIds) {
            jdbc.update(
                "INSERT INTO customer_thanas (customer_id, thana_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                customerId, thanaId
            );
        }
    }

    public int countAll() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM customers", Integer.class);
    }

    public List<com.kosaibari.domain.Butcher> findFavoriteButchers(UUID customerId) {
        return jdbc.query(
            """
            SELECT b.*, u.phone, u.name
            FROM butchers b
            JOIN users u ON u.id = b.user_id
            JOIN favorites f ON f.butcher_id = b.id
            WHERE f.customer_id = ?
            ORDER BY f.created_at DESC
            """,
            (rs, rowNum) -> {
                com.kosaibari.domain.Butcher b = new com.kosaibari.domain.Butcher();
                b.setId(UUID.fromString(rs.getString("id")));
                b.setUserId(UUID.fromString(rs.getString("user_id")));
                b.setWhatsapp(rs.getString("whatsapp"));
                b.setPhotoUrl(rs.getString("photo_url"));
                b.setCowPrice(rs.getObject("cow_price", Integer.class));
                b.setGoatPrice(rs.getObject("goat_price", Integer.class));
                b.setCowCapacity(rs.getObject("cow_capacity", Integer.class));
                b.setGoatCapacity(rs.getObject("goat_capacity", Integer.class));
                b.setRating(rs.getBigDecimal("rating"));
                b.setTotalReviews(rs.getInt("total_reviews"));
                b.setStatus(com.kosaibari.domain.Butcher.ButcherStatus.valueOf(rs.getString("status")));
                b.setCreatedAt(rs.getTimestamp("created_at").toInstant());
                b.setUpdatedAt(rs.getTimestamp("updated_at").toInstant());

                User u = new User();
                u.setId(UUID.fromString(rs.getString("user_id")));
                u.setPhone(rs.getString("phone"));
                u.setName(rs.getString("name"));
                u.setUserType(User.UserType.BUTCHER);
                b.setUser(u);

                return b;
            },
            customerId
        );
    }

    public void addFavorite(UUID customerId, UUID butcherId) {
        jdbc.update(
            """
            INSERT INTO favorites (id, customer_id, butcher_id)
            VALUES (?, ?, ?)
            ON CONFLICT (customer_id, butcher_id) DO NOTHING
            """,
            UUID.randomUUID(), customerId, butcherId
        );
    }

    public void removeFavorite(UUID customerId, UUID butcherId) {
        jdbc.update(
            "DELETE FROM favorites WHERE customer_id = ? AND butcher_id = ?",
            customerId, butcherId
        );
    }

    private List<Thana> findThanas(UUID customerId) {
        return jdbc.query(
            """
            SELECT t.* FROM thanas t
            JOIN customer_thanas ct ON ct.thana_id = t.id
            WHERE ct.customer_id = ?
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
            customerId
        );
    }
}
