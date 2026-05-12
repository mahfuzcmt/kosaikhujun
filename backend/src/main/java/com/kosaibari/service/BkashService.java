package com.kosaibari.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kosaibari.repository.AppSettingsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class BkashService {

    public static final String KEY_BASE_URL = "bkash_base_url";
    public static final String KEY_APP_KEY = "bkash_app_key";
    public static final String KEY_APP_SECRET = "bkash_app_secret";
    public static final String KEY_USERNAME = "bkash_username";
    public static final String KEY_PASSWORD = "bkash_password";
    public static final String KEY_CALLBACK_URL = "bkash_callback_url";

    private final AppSettingsRepository settingsRepo;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Token cache. Invalidated when the app_key changes so credential rotation
    // takes effect immediately without restart.
    private String cachedToken;
    private Instant tokenExpiry;
    private String cachedTokenAppKey;

    private String baseUrl()     { return settingsRepo.getValue(KEY_BASE_URL, "https://tokenized.sandbox.bka.sh/v1.2.0-beta"); }
    private String appKey()      { return settingsRepo.getValue(KEY_APP_KEY, ""); }
    private String appSecret()   { return settingsRepo.getValue(KEY_APP_SECRET, ""); }
    private String username()    { return settingsRepo.getValue(KEY_USERNAME, ""); }
    private String password()    { return settingsRepo.getValue(KEY_PASSWORD, ""); }
    private String callbackUrl() { return settingsRepo.getValue(KEY_CALLBACK_URL, ""); }

    /**
     * Get access token from bKash (grant token)
     */
    public String getAccessToken() {
        String appKey = appKey();
        // Return cached token if still valid (with 5 min buffer) AND keyed to the same app_key.
        if (cachedToken != null
            && tokenExpiry != null
            && appKey.equals(cachedTokenAppKey)
            && Instant.now().plusSeconds(300).isBefore(tokenExpiry)) {
            return cachedToken;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("username", username());
            headers.set("password", password());

            Map<String, String> body = new HashMap<>();
            body.put("app_key", appKey);
            body.put("app_secret", appSecret());

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                baseUrl() + "/tokenized/checkout/token/grant",
                request,
                String.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode json = objectMapper.readTree(response.getBody());
                cachedToken = json.get("id_token").asText();
                cachedTokenAppKey = appKey;
                // Token expires in 1 hour, but we'll refresh earlier
                tokenExpiry = Instant.now().plusSeconds(3600);
                log.info("bKash token obtained successfully");
                return cachedToken;
            }

            log.error("Failed to get bKash token: {}", response.getBody());
            throw new RuntimeException("Failed to get bKash token");

        } catch (Exception e) {
            log.error("Error getting bKash token", e);
            throw new RuntimeException("bKash authentication failed", e);
        }
    }

    /**
     * Create a payment request
     */
    public BkashPaymentResponse createPayment(int amount, String invoiceNumber, String payerReference) {
        try {
            String token = getAccessToken();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", token);
            headers.set("X-APP-Key", appKey());

            Map<String, Object> body = new HashMap<>();
            body.put("mode", "0011");
            body.put("payerReference", payerReference);
            body.put("callbackURL", callbackUrl());
            body.put("amount", String.valueOf(amount));
            body.put("currency", "BDT");
            body.put("intent", "sale");
            body.put("merchantInvoiceNumber", invoiceNumber);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);

            log.info("Creating bKash payment: amount={}, invoice={}", amount, invoiceNumber);

            ResponseEntity<String> response = restTemplate.postForEntity(
                baseUrl() + "/tokenized/checkout/create",
                request,
                String.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode json = objectMapper.readTree(response.getBody());

                String statusCode = json.has("statusCode") ? json.get("statusCode").asText() : "";

                if ("0000".equals(statusCode)) {
                    BkashPaymentResponse result = new BkashPaymentResponse();
                    result.setPaymentID(json.get("paymentID").asText());
                    result.setBkashURL(json.get("bkashURL").asText());
                    result.setStatusCode(statusCode);
                    result.setStatusMessage(json.has("statusMessage") ? json.get("statusMessage").asText() : "Success");
                    log.info("bKash payment created: paymentID={}", result.getPaymentID());
                    return result;
                } else {
                    String errorMsg = json.has("statusMessage") ? json.get("statusMessage").asText() : "Payment creation failed";
                    log.error("bKash payment creation failed: {}", errorMsg);
                    throw new RuntimeException("bKash error: " + errorMsg);
                }
            }

            log.error("bKash payment creation failed: {}", response.getBody());
            throw new RuntimeException("Failed to create bKash payment");

        } catch (Exception e) {
            log.error("Error creating bKash payment", e);
            throw new RuntimeException("bKash payment creation failed: " + e.getMessage(), e);
        }
    }

    /**
     * Execute a payment after user completes on bKash
     */
    public BkashExecuteResponse executePayment(String paymentID) {
        try {
            String token = getAccessToken();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", token);
            headers.set("X-APP-Key", appKey());

            Map<String, String> body = new HashMap<>();
            body.put("paymentID", paymentID);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

            log.info("Executing bKash payment: paymentID={}", paymentID);

            ResponseEntity<String> response = restTemplate.postForEntity(
                baseUrl() + "/tokenized/checkout/execute",
                request,
                String.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode json = objectMapper.readTree(response.getBody());

                String statusCode = json.has("statusCode") ? json.get("statusCode").asText() : "";
                String statusMessage = json.has("statusMessage") ? json.get("statusMessage").asText() : "";
                String transactionStatus = json.has("transactionStatus") ? json.get("transactionStatus").asText() : "";

                BkashExecuteResponse result = new BkashExecuteResponse();
                result.setPaymentID(paymentID);
                result.setStatusCode(statusCode);
                result.setStatusMessage(statusMessage);
                result.setTransactionStatus(transactionStatus);

                if (json.has("trxID")) {
                    result.setTrxID(json.get("trxID").asText());
                }
                if (json.has("amount")) {
                    result.setAmount(json.get("amount").asText());
                }
                if (json.has("payerReference")) {
                    result.setPayerReference(json.get("payerReference").asText());
                }
                if (json.has("merchantInvoiceNumber")) {
                    result.setMerchantInvoiceNumber(json.get("merchantInvoiceNumber").asText());
                }

                if (!"0000".equals(statusCode) || !"Completed".equalsIgnoreCase(transactionStatus)) {
                    log.error("bKash execute returned non-success: paymentID={}, statusCode={}, statusMessage={}, transactionStatus={}, body={}",
                        paymentID, statusCode, statusMessage, transactionStatus, response.getBody());
                } else {
                    log.info("bKash payment executed: paymentID={}, statusCode={}, transactionStatus={}, trxID={}",
                        paymentID, statusCode, transactionStatus, result.getTrxID());
                }

                return result;
            }

            log.error("bKash execute failed: status={}, body={}", response.getStatusCode(), response.getBody());
            throw new RuntimeException("Failed to execute bKash payment");

        } catch (Exception e) {
            log.error("Error executing bKash payment", e);
            throw new RuntimeException("bKash payment execution failed: " + e.getMessage(), e);
        }
    }

    /**
     * Query payment status
     */
    public BkashExecuteResponse queryPayment(String paymentID) {
        try {
            String token = getAccessToken();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", token);
            headers.set("X-APP-Key", appKey());

            Map<String, String> body = new HashMap<>();
            body.put("paymentID", paymentID);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(
                baseUrl() + "/tokenized/checkout/payment/status",
                request,
                String.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode json = objectMapper.readTree(response.getBody());

                BkashExecuteResponse result = new BkashExecuteResponse();
                result.setPaymentID(paymentID);
                result.setStatusCode(json.has("statusCode") ? json.get("statusCode").asText() : "");
                result.setStatusMessage(json.has("statusMessage") ? json.get("statusMessage").asText() : "");
                result.setTransactionStatus(json.has("transactionStatus") ? json.get("transactionStatus").asText() : "");

                if (json.has("trxID")) {
                    result.setTrxID(json.get("trxID").asText());
                }

                return result;
            }

            throw new RuntimeException("Failed to query bKash payment");

        } catch (Exception e) {
            log.error("Error querying bKash payment", e);
            throw new RuntimeException("bKash payment query failed: " + e.getMessage(), e);
        }
    }

    // Response DTOs
    @lombok.Data
    public static class BkashPaymentResponse {
        private String paymentID;
        private String bkashURL;
        private String statusCode;
        private String statusMessage;
    }

    @lombok.Data
    public static class BkashExecuteResponse {
        private String paymentID;
        private String trxID;
        private String amount;
        private String statusCode;
        private String statusMessage;
        private String transactionStatus;
        private String payerReference;
        private String merchantInvoiceNumber;
    }
}
