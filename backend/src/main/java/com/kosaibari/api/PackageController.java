package com.kosaibari.api;

import com.kosaibari.domain.Package;
import com.kosaibari.domain.Payment;
import com.kosaibari.domain.Subscription;
import com.kosaibari.domain.User;
import com.kosaibari.dto.PackageDto;
import com.kosaibari.dto.SubscriptionDto;
import com.kosaibari.repository.PaymentRepository;
import com.kosaibari.repository.SubscriptionRepository;
import com.kosaibari.repository.UserRepository;
import com.kosaibari.security.UserContext;
import com.kosaibari.service.BkashService;
import com.kosaibari.service.CustomerService;
import com.kosaibari.service.SmsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Slf4j
public class PackageController {

    private final SubscriptionRepository subscriptionRepo;
    private final PaymentRepository paymentRepo;
    private final UserRepository userRepo;
    private final CustomerService customerService;
    private final BkashService bkashService;
    private final SmsService smsService;

    @GetMapping("/packages")
    public ResponseEntity<Map<String, Object>> getPackages() {
        List<PackageDto> packages = subscriptionRepo.findAllPackages().stream()
            .map(PackageDto::from)
            .toList();
        return ResponseEntity.ok(Map.of("data", packages));
    }

    @PostMapping("/subscriptions")
    public ResponseEntity<Map<String, Object>> purchasePackage(@RequestBody Map<String, Integer> req) {
        Integer packageId = req.get("packageId");
        if (packageId == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("message", "packageId is required")
            ));
        }

        User currentUser = UserContext.require();
        if (currentUser.getUserType() != User.UserType.CUSTOMER) {
            return ResponseEntity.status(403).body(Map.of(
                "error", Map.of("message", "শুধুমাত্র গ্রাহকরা প্যাকেজ কিনতে পারবেন")
            ));
        }

        // Get package details
        var pkg = subscriptionRepo.findPackageById(packageId)
            .orElseThrow(() -> new RuntimeException("Package not found"));

        try {
            // Create bKash payment
            String invoiceNumber = "KB-" + System.currentTimeMillis();
            String payerReference = currentUser.getPhone();

            BkashService.BkashPaymentResponse bkashResponse = bkashService.createPayment(
                pkg.getPrice(),
                invoiceNumber,
                payerReference
            );

            // Create pending payment record
            Payment payment = paymentRepo.create(
                currentUser.getId(),
                packageId,
                pkg.getPrice(),
                Payment.PaymentMethod.BKASH,
                bkashResponse.getPaymentID()
            );

            log.info("Created bKash payment: paymentId={}, bkashPaymentId={}",
                payment.getId(), bkashResponse.getPaymentID());

            return ResponseEntity.ok(Map.of(
                "data", Map.of(
                    "paymentId", payment.getId().toString(),
                    "bkashPaymentId", bkashResponse.getPaymentID(),
                    "bkashURL", bkashResponse.getBkashURL()
                )
            ));

        } catch (Exception e) {
            log.error("Failed to create bKash payment", e);
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("message", "পেমেন্ট শুরু করতে সমস্যা হয়েছে: " + e.getMessage())
            ));
        }
    }

    @PostMapping("/payment/callback")
    public ResponseEntity<Map<String, Object>> handlePaymentCallback(@RequestBody Map<String, String> req) {
        String paymentID = req.get("paymentID");
        String status = req.get("status");

        log.info("bKash callback received: paymentID={}, status={}", paymentID, status);

        if (paymentID == null) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("message", "paymentID is required")
            ));
        }

        // Find payment record
        Payment payment = paymentRepo.findByBkashPaymentId(paymentID)
            .orElse(null);

        if (payment == null) {
            log.error("Payment not found for bkashPaymentId: {}", paymentID);
            return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("message", "Payment not found")
            ));
        }

        // If payment already processed, return current status
        if (payment.getStatus() != Payment.PaymentStatus.PENDING) {
            return ResponseEntity.ok(Map.of(
                "data", Map.of(
                    "status", payment.getStatus().name(),
                    "message", payment.getStatus() == Payment.PaymentStatus.SUCCESS ? "পেমেন্ট সফল হয়েছে" : "পেমেন্ট ব্যর্থ হয়েছে"
                )
            ));
        }

        // Handle based on status from callback
        if ("success".equalsIgnoreCase(status)) {
            try {
                // Execute the payment
                BkashService.BkashExecuteResponse executeResponse = bkashService.executePayment(paymentID);

                if ("Completed".equalsIgnoreCase(executeResponse.getTransactionStatus())) {
                    // Create subscription
                    Subscription sub = customerService.purchasePackage(payment.getPackageId());

                    // Update payment as success
                    paymentRepo.updateSuccess(payment.getId(), executeResponse.getTrxID(), sub.getId());

                    log.info("Payment successful: paymentId={}, trxID={}, subscriptionId={}",
                        payment.getId(), executeResponse.getTrxID(), sub.getId());

                    // Send SMS notification to customer
                    try {
                        User user = userRepo.findById(payment.getUserId()).orElse(null);
                        Package pkg = subscriptionRepo.findPackageById(payment.getPackageId()).orElse(null);
                        if (user != null && pkg != null && user.getPhone() != null) {
                            int contactLimit = pkg.getContactLimit() != null ? pkg.getContactLimit() : 0;
                            smsService.sendPackagePurchaseConfirmation(
                                user.getPhone(),
                                pkg.getNameBn() != null ? pkg.getNameBn() : pkg.getName(),
                                contactLimit,
                                executeResponse.getTrxID()
                            );
                            log.info("SMS sent to customer {} for package purchase", user.getPhone());
                        }
                    } catch (Exception smsEx) {
                        log.error("Failed to send package purchase SMS: {}", smsEx.getMessage());
                        // Don't fail the payment because of SMS error
                    }

                    return ResponseEntity.ok(Map.of(
                        "data", Map.of(
                            "status", "SUCCESS",
                            "message", "পেমেন্ট সফল হয়েছে!",
                            "subscription", SubscriptionDto.from(sub),
                            "trxID", executeResponse.getTrxID()
                        )
                    ));
                } else {
                    // Payment not completed — surface the bKash error so the user (and logs) see why
                    paymentRepo.updateFailed(payment.getId());
                    String bkashCode = executeResponse.getStatusCode();
                    String bkashMsg  = executeResponse.getStatusMessage();
                    String userMsg = "পেমেন্ট সম্পন্ন হয়নি";
                    if (bkashMsg != null && !bkashMsg.isBlank()) {
                        userMsg = userMsg + " (bKash: " + bkashMsg
                            + (bkashCode != null && !bkashCode.isBlank() ? " — " + bkashCode : "")
                            + ")";
                    }
                    return ResponseEntity.ok(Map.of(
                        "data", Map.of(
                            "status", "FAILED",
                            "message", userMsg,
                            "bkashStatusCode", bkashCode == null ? "" : bkashCode,
                            "bkashStatusMessage", bkashMsg == null ? "" : bkashMsg
                        )
                    ));
                }

            } catch (Exception e) {
                log.error("Failed to execute payment", e);
                paymentRepo.updateFailed(payment.getId());
                return ResponseEntity.ok(Map.of(
                    "data", Map.of(
                        "status", "FAILED",
                        "message", "পেমেন্ট প্রক্রিয়াকরণে সমস্যা হয়েছে"
                    )
                ));
            }
        } else {
            // Payment cancelled or failed
            paymentRepo.updateFailed(payment.getId());
            return ResponseEntity.ok(Map.of(
                "data", Map.of(
                    "status", "FAILED",
                    "message", "পেমেন্ট বাতিল করা হয়েছে"
                )
            ));
        }
    }

    @GetMapping("/payment/{paymentId}/status")
    public ResponseEntity<Map<String, Object>> getPaymentStatus(@PathVariable UUID paymentId) {
        Payment payment = paymentRepo.findById(paymentId)
            .orElse(null);

        if (payment == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(Map.of(
            "data", Map.of(
                "status", payment.getStatus().name(),
                "transactionId", payment.getTransactionId() != null ? payment.getTransactionId() : ""
            )
        ));
    }
}
