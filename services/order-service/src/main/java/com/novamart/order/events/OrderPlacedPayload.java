package com.novamart.order.events;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

import com.novamart.order.domain.Order;
import com.novamart.order.domain.OrderItem;

/**
 * Lightweight DTO that is serialized as the EventBridge detail for order.placed.
 */
public class OrderPlacedPayload {

    private Long orderId;
    private String customerId;
    private BigDecimal totalAmount;
    private OffsetDateTime createdAt;
    private List<OrderItemPayload> items;

    public OrderPlacedPayload(Order order) {
        this.orderId = order.getId();
        this.customerId = order.getCustomerId();
        this.totalAmount = order.getTotalAmount();
        this.createdAt = order.getCreatedAt();
        this.items = order.getItems().stream()
            .map(OrderItemPayload::new)
            .toList();
    }

    public Long getOrderId() {
        return orderId;
    }

    public String getCustomerId() {
        return customerId;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public List<OrderItemPayload> getItems() {
        return items;
    }

    public static class OrderItemPayload {
        private String productId;
        private Long catalogProductId;
        private Integer quantity;
        private BigDecimal unitPrice;

        public OrderItemPayload(OrderItem item) {
            this.productId = item.getProductSku() != null && !item.getProductSku().isBlank()
                ? item.getProductSku()
                : String.valueOf(item.getProductId());
            this.catalogProductId = item.getProductId();
            this.quantity = item.getQuantity();
            this.unitPrice = item.getUnitPrice();
        }

        public String getProductId() {
            return productId;
        }

        public Long getCatalogProductId() {
            return catalogProductId;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public BigDecimal getUnitPrice() {
            return unitPrice;
        }
    }
}
