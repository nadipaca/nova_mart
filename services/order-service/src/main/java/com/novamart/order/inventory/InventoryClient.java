package com.novamart.order.inventory;

import java.util.List;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import com.novamart.order.dto.CreateOrderItemRequest;

import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;

@Component
public class InventoryClient {

    private static final Logger log = LoggerFactory.getLogger(InventoryClient.class);

    private final DynamoDbClient dynamoDb;
    private final String tableName;
    private final boolean enforce;

    public InventoryClient(
        @Value("${aws.region}") String awsRegion,
        @Value("${novamart.inventory.table:${INVENTORY_TABLE_NAME:inventory}}") String tableName,
        @Value("${novamart.inventory.enforce:${INVENTORY_ENFORCE:true}}") boolean enforce
    ) {
        this.dynamoDb = DynamoDbClient.builder()
            .region(Region.of(awsRegion))
            .build();
        this.tableName = tableName;
        this.enforce = enforce;
    }

    public void assertSufficientStock(List<CreateOrderItemRequest> items) {
        if (!enforce) {
            return;
        }

        java.util.ArrayList<InsufficientStockItem> insufficient = new java.util.ArrayList<>();
        for (CreateOrderItemRequest item : items) {
            String inventoryProductId = normalizeInventoryProductId(item);
            int requested = item.getQuantity() == null ? 0 : item.getQuantity();

            int available = getAvailableStock(inventoryProductId);
            if (available < requested) {
                insufficient.add(new InsufficientStockItem(inventoryProductId, requested, available));
            }
        }

        if (!insufficient.isEmpty()) {
            throw new InsufficientStockException(insufficient);
        }
    }

    private int getAvailableStock(String inventoryProductId) {
        try {
            GetItemRequest request = GetItemRequest.builder()
                .tableName(tableName)
                .consistentRead(true)
                .key(
                    java.util.Map.of(
                        "productId", AttributeValue.builder().s(inventoryProductId).build()
                    )
                )
                .build();

            GetItemResponse response = dynamoDb.getItem(request);
            AttributeValue stock = response.item() == null ? null : response.item().get("stock");
            if (stock == null || stock.n() == null) {
                return 0;
            }
            return Integer.parseInt(stock.n());
        } catch (NumberFormatException e) {
            log.warn("Inventory stock is not numeric for productId={}", inventoryProductId);
            return 0;
        } catch (DynamoDbException e) {
            log.error("Inventory lookup failed for productId={}", inventoryProductId, e);
            throw new ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Inventory service unavailable"
            );
        }
    }

    private static String normalizeInventoryProductId(CreateOrderItemRequest item) {
        String sku = item.getProductSku();
        if (sku != null && !sku.isBlank()) {
            return sku.trim().toLowerCase();
        }
        return Objects.toString(item.getProductId(), "").trim();
    }
}
