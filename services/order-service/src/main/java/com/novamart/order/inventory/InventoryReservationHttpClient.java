package com.novamart.order.inventory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.novamart.order.domain.Order;
import com.novamart.order.domain.OrderItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

@Component
public class InventoryReservationHttpClient {

    private static final Logger log = LoggerFactory.getLogger(InventoryReservationHttpClient.class);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String reserveUrl;

    public InventoryReservationHttpClient(
        ObjectMapper objectMapper,
        @Value("${novamart.inventory.reserve-url:${INVENTORY_RESERVE_URL:}}") String reserveUrl
    ) {
        this.objectMapper = objectMapper;
        this.reserveUrl = reserveUrl == null ? "" : reserveUrl.trim();
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(2))
            .build();
    }

    public void reserveInventoryIfConfigured(Order order) {
        if (reserveUrl.isBlank()) {
            return;
        }

        try {
            String body = objectMapper.writeValueAsString(new InventoryReserveEvent(new InventoryReserveRequest(order)));
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(reserveUrl))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            int status = response.statusCode();
            if (status == 200 || status == 409) {
                log.info("Inventory reserve triggered via HTTP (status={}) for orderId={}", status, order.getId());
                return;
            }

            log.warn(
                "Inventory reserve HTTP returned unexpected status={} for orderId={}, body={}",
                status,
                order.getId(),
                response.body()
            );
        } catch (Exception e) {
            log.warn("Inventory reserve HTTP call failed for orderId={}", order.getId(), e);
        }
    }

    private static long toCents(BigDecimal amount) {
        if (amount == null) return 0;
        return amount
            .multiply(BigDecimal.valueOf(100))
            .setScale(0, RoundingMode.HALF_UP)
            .longValue();
    }

    private record InventoryReserveEvent(InventoryReserveRequest detail) { }

    private record InventoryReserveRequest(
        String orderId,
        String customerId,
        String userId,
        Long totalCents,
        List<Item> items
    ) {
        private InventoryReserveRequest(Order order) {
            this(
                String.valueOf(order.getId()),
                order.getCustomerId(),
                order.getCustomerId(),
                toCents(order.getTotalAmount()),
                order.getItems().stream().map(Item::new).toList()
            );
        }

        private record Item(String productId, Integer quantity) {
            private Item(OrderItem item) {
                this(
                    item.getProductSku() != null && !item.getProductSku().isBlank()
                        ? item.getProductSku().trim().toLowerCase()
                        : String.valueOf(item.getProductId()),
                    item.getQuantity()
                );
            }
        }
    }
}
