package com.kosaibari.repository;

import com.kosaibari.domain.Payment;
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
public class PaymentRepository {

    private final JdbcTemplate jdbc;

    private static final RowMapper<Payment> PAYMENT_MAPPER = (rs, rowNum) -> {
        Payment p = new Payment();
        p.setId(UUID.fromString(rs.getString("id")));
        p.setUserId(UUID.fromString(rs.getString("user_id")));
        String subId = rs.getString("subscription_id");
        if (subId != null) {
            p.setSubscriptionId(UUID.fromString(subId));
        }
        p.setPackageId(rs.getObject("package_id", Integer.class));
        p.setAmount(rs.getInt("amount"));
        p.setMethod(Payment.PaymentMethod.valueOf(rs.getString("method")));
        p.setTransactionId(rs.getString("transaction_id"));
        p.setBkashPaymentId(rs.getString("bkash_payment_id"));
        p.setStatus(Payment.PaymentStatus.valueOf(rs.getString("status")));
        Timestamp paidAt = rs.getTimestamp("paid_at");
        if (paidAt != null) {
            p.setPaidAt(paidAt.toInstant());
        }
        p.setCreatedAt(rs.getTimestamp("created_at").toInstant());
        return p;
    };

    public Payment create(UUID userId, int packageId, int amount, Payment.PaymentMethod method, String bkashPaymentId) {
        UUID id = UUID.randomUUID();
        jdbc.update(
            """
            INSERT INTO payments (id, user_id, package_id, amount, method, bkash_payment_id, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'PENDING', now())
            """,
            id, userId, packageId, amount, method.name(), bkashPaymentId
        );
        return findById(id).orElseThrow();
    }

    public Optional<Payment> findById(UUID id) {
        var list = jdbc.query(
            "SELECT * FROM payments WHERE id = ?",
            PAYMENT_MAPPER, id
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public Optional<Payment> findByBkashPaymentId(String bkashPaymentId) {
        var list = jdbc.query(
            "SELECT * FROM payments WHERE bkash_payment_id = ?",
            PAYMENT_MAPPER, bkashPaymentId
        );
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public void updateSuccess(UUID id, String transactionId, UUID subscriptionId) {
        jdbc.update(
            """
            UPDATE payments
            SET status = 'SUCCESS', transaction_id = ?, subscription_id = ?, paid_at = now()
            WHERE id = ?
            """,
            transactionId, subscriptionId, id
        );
    }

    public void updateFailed(UUID id) {
        jdbc.update(
            "UPDATE payments SET status = 'FAILED' WHERE id = ?",
            id
        );
    }

    public List<Payment> findByUserId(UUID userId) {
        return jdbc.query(
            "SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC",
            PAYMENT_MAPPER, userId
        );
    }
}
