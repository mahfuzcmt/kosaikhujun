package com.kosaibari.repository;

import com.kosaibari.domain.Package;
import com.kosaibari.domain.Subscription;
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
public class SubscriptionRepository {

    private final JdbcTemplate jdbc;

    private static final RowMapper<Package> PACKAGE_MAPPER = (rs, rowNum) -> {
        Package p = new Package();
        p.setId(rs.getInt("id"));
        p.setName(rs.getString("name"));
        p.setNameBn(rs.getString("name_bn"));
        p.setDescription(rs.getString("description"));
        p.setDescriptionBn(rs.getString("description_bn"));
        p.setContactLimit(rs.getObject("contact_limit", Integer.class));
        p.setPrice(rs.getInt("price"));
        p.setActive(rs.getBoolean("is_active"));
        p.setSortOrder(rs.getInt("sort_order"));
        return p;
    };

    private static final RowMapper<Subscription> SUB_MAPPER = (rs, rowNum) -> {
        Subscription s = new Subscription();
        s.setId(UUID.fromString(rs.getString("id")));
        s.setCustomerId(UUID.fromString(rs.getString("customer_id")));
        s.setPackageId(rs.getInt("package_id"));
        s.setContactsUsed(rs.getInt("contacts_used"));
        s.setPurchasedAt(rs.getTimestamp("purchased_at").toInstant());
        Timestamp expiresAt = rs.getTimestamp("expires_at");
        if (expiresAt != null) s.setExpiresAt(expiresAt.toInstant());
        s.setStatus(Subscription.SubscriptionStatus.valueOf(rs.getString("status")));
        return s;
    };

    public List<Package> findAllPackages() {
        return jdbc.query(
            "SELECT * FROM packages WHERE is_active = true ORDER BY sort_order",
            PACKAGE_MAPPER
        );
    }

    public Optional<Package> findPackageById(int id) {
        var list = jdbc.query(
            "SELECT * FROM packages WHERE id = ?",
            PACKAGE_MAPPER, id
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public Optional<Subscription> findActiveByCustomer(UUID customerId) {
        var list = jdbc.query(
            """
            SELECT s.id, s.customer_id, s.package_id, s.contacts_used, s.purchased_at, s.expires_at, s.status,
                   p.id as pkg_id, p.name, p.name_bn, p.description, p.description_bn, p.contact_limit, p.price, p.is_active, p.sort_order
            FROM subscriptions s
            JOIN packages p ON p.id = s.package_id
            WHERE s.customer_id = ? AND s.status = 'ACTIVE'
            ORDER BY s.purchased_at DESC LIMIT 1
            """,
            (rs, rowNum) -> {
                Subscription s = SUB_MAPPER.mapRow(rs, rowNum);
                Package p = new Package();
                p.setId(rs.getInt("pkg_id"));
                p.setName(rs.getString("name"));
                p.setNameBn(rs.getString("name_bn"));
                p.setDescription(rs.getString("description"));
                p.setDescriptionBn(rs.getString("description_bn"));
                p.setContactLimit(rs.getObject("contact_limit", Integer.class));
                p.setPrice(rs.getInt("price"));
                p.setActive(rs.getBoolean("is_active"));
                p.setSortOrder(rs.getInt("sort_order"));
                s.setPkg(p);
                return s;
            },
            customerId
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public Subscription create(UUID customerId, int packageId) {
        UUID id = UUID.randomUUID();
        jdbc.update(
            """
            INSERT INTO subscriptions (id, customer_id, package_id, contacts_used, status)
            VALUES (?, ?, ?, 0, 'ACTIVE')
            """,
            id, customerId, packageId
        );
        return findById(id).orElseThrow();
    }

    public Optional<Subscription> findById(UUID id) {
        var list = jdbc.query(
            """
            SELECT s.id, s.customer_id, s.package_id, s.contacts_used, s.purchased_at, s.expires_at, s.status,
                   p.id as pkg_id, p.name, p.name_bn, p.description, p.description_bn, p.contact_limit, p.price, p.is_active, p.sort_order
            FROM subscriptions s
            JOIN packages p ON p.id = s.package_id
            WHERE s.id = ?
            """,
            (rs, rowNum) -> {
                Subscription s = SUB_MAPPER.mapRow(rs, rowNum);
                Package p = new Package();
                p.setId(rs.getInt("pkg_id"));
                p.setName(rs.getString("name"));
                p.setNameBn(rs.getString("name_bn"));
                p.setDescription(rs.getString("description"));
                p.setDescriptionBn(rs.getString("description_bn"));
                p.setContactLimit(rs.getObject("contact_limit", Integer.class));
                p.setPrice(rs.getInt("price"));
                p.setActive(rs.getBoolean("is_active"));
                p.setSortOrder(rs.getInt("sort_order"));
                s.setPkg(p);
                return s;
            },
            id
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public void incrementContactsUsed(UUID id) {
        jdbc.update(
            "UPDATE subscriptions SET contacts_used = contacts_used + 1 WHERE id = ?",
            id
        );
    }

    public boolean hasUnlockedContact(UUID customerId, UUID butcherId) {
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM unlocked_contacts WHERE customer_id = ? AND butcher_id = ?",
            Integer.class, customerId, butcherId
        );
        return count != null && count > 0;
    }

    public void unlockContact(UUID customerId, UUID butcherId, UUID subscriptionId) {
        jdbc.update(
            """
            INSERT INTO unlocked_contacts (id, customer_id, butcher_id, subscription_id)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (customer_id, butcher_id) DO NOTHING
            """,
            UUID.randomUUID(), customerId, butcherId, subscriptionId
        );
    }

    public List<UUID> findUnlockedButcherIds(UUID customerId) {
        return jdbc.query(
            "SELECT butcher_id FROM unlocked_contacts WHERE customer_id = ?",
            (rs, rowNum) -> UUID.fromString(rs.getString("butcher_id")),
            customerId
        );
    }

    public int countPaidCustomers() {
        return jdbc.queryForObject(
            "SELECT COUNT(DISTINCT customer_id) FROM subscriptions WHERE status = 'ACTIVE'",
            Integer.class
        );
    }

    // Get all subscriptions for a customer (for purchase history)
    public List<Subscription> findAllByCustomer(UUID customerId) {
        return jdbc.query(
            """
            SELECT s.id, s.customer_id, s.package_id, s.contacts_used, s.purchased_at, s.expires_at, s.status,
                   p.id as pkg_id, p.name, p.name_bn, p.description, p.description_bn, p.contact_limit, p.price, p.is_active, p.sort_order
            FROM subscriptions s
            JOIN packages p ON p.id = s.package_id
            WHERE s.customer_id = ?
            ORDER BY s.purchased_at DESC
            """,
            (rs, rowNum) -> {
                Subscription s = SUB_MAPPER.mapRow(rs, rowNum);
                Package p = new Package();
                p.setId(rs.getInt("pkg_id"));
                p.setName(rs.getString("name"));
                p.setNameBn(rs.getString("name_bn"));
                p.setDescription(rs.getString("description"));
                p.setDescriptionBn(rs.getString("description_bn"));
                p.setContactLimit(rs.getObject("contact_limit", Integer.class));
                p.setPrice(rs.getInt("price"));
                p.setActive(rs.getBoolean("is_active"));
                p.setSortOrder(rs.getInt("sort_order"));
                s.setPkg(p);
                return s;
            },
            customerId
        );
    }

    // Get all active subscriptions for a customer (for stacking contact limits)
    public List<Subscription> findAllActiveByCustomer(UUID customerId) {
        return jdbc.query(
            """
            SELECT s.id, s.customer_id, s.package_id, s.contacts_used, s.purchased_at, s.expires_at, s.status,
                   p.id as pkg_id, p.name, p.name_bn, p.description, p.description_bn, p.contact_limit, p.price, p.is_active, p.sort_order
            FROM subscriptions s
            JOIN packages p ON p.id = s.package_id
            WHERE s.customer_id = ? AND s.status = 'ACTIVE'
            ORDER BY s.purchased_at DESC
            """,
            (rs, rowNum) -> {
                Subscription s = SUB_MAPPER.mapRow(rs, rowNum);
                Package p = new Package();
                p.setId(rs.getInt("pkg_id"));
                p.setName(rs.getString("name"));
                p.setNameBn(rs.getString("name_bn"));
                p.setDescription(rs.getString("description"));
                p.setDescriptionBn(rs.getString("description_bn"));
                p.setContactLimit(rs.getObject("contact_limit", Integer.class));
                p.setPrice(rs.getInt("price"));
                p.setActive(rs.getBoolean("is_active"));
                p.setSortOrder(rs.getInt("sort_order"));
                s.setPkg(p);
                return s;
            },
            customerId
        );
    }

    // Get total contact limit across all active subscriptions
    public int getTotalContactLimit(UUID customerId) {
        Integer total = jdbc.queryForObject(
            """
            SELECT COALESCE(SUM(p.contact_limit), 0)
            FROM subscriptions s
            JOIN packages p ON p.id = s.package_id
            WHERE s.customer_id = ? AND s.status = 'ACTIVE' AND p.contact_limit IS NOT NULL
            """,
            Integer.class, customerId
        );
        return total != null ? total : 0;
    }

    // Get total contacts used across all active subscriptions
    public int getTotalContactsUsed(UUID customerId) {
        Integer total = jdbc.queryForObject(
            """
            SELECT COALESCE(SUM(s.contacts_used), 0)
            FROM subscriptions s
            WHERE s.customer_id = ? AND s.status = 'ACTIVE'
            """,
            Integer.class, customerId
        );
        return total != null ? total : 0;
    }

    // Find subscription with remaining contacts to use
    public Optional<Subscription> findSubscriptionWithRemainingContacts(UUID customerId) {
        var list = jdbc.query(
            """
            SELECT s.id, s.customer_id, s.package_id, s.contacts_used, s.purchased_at, s.expires_at, s.status,
                   p.id as pkg_id, p.name, p.name_bn, p.description, p.description_bn, p.contact_limit, p.price, p.is_active, p.sort_order
            FROM subscriptions s
            JOIN packages p ON p.id = s.package_id
            WHERE s.customer_id = ? AND s.status = 'ACTIVE'
              AND (p.contact_limit IS NULL OR s.contacts_used < p.contact_limit)
            ORDER BY s.purchased_at ASC
            LIMIT 1
            """,
            (rs, rowNum) -> {
                Subscription s = SUB_MAPPER.mapRow(rs, rowNum);
                Package p = new Package();
                p.setId(rs.getInt("pkg_id"));
                p.setName(rs.getString("name"));
                p.setNameBn(rs.getString("name_bn"));
                p.setDescription(rs.getString("description"));
                p.setDescriptionBn(rs.getString("description_bn"));
                p.setContactLimit(rs.getObject("contact_limit", Integer.class));
                p.setPrice(rs.getInt("price"));
                p.setActive(rs.getBoolean("is_active"));
                p.setSortOrder(rs.getInt("sort_order"));
                s.setPkg(p);
                return s;
            },
            customerId
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }
}
