package com.novamart.order.web;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.novamart.order.inventory.InsufficientStockException;
import com.novamart.order.inventory.InsufficientStockItem;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class InventoryExceptionHandler {

    @ExceptionHandler(InsufficientStockException.class)
    public ResponseEntity<Map<String, Object>> handleInsufficientStock(InsufficientStockException ex) {
        List<InsufficientStockItem> items = ex.getItems();

        String message;
        if (items.size() == 1) {
            InsufficientStockItem item = items.get(0);
            message = "Item " + item.productId() + " is out of stock. Available " + item.available()
                + ", requested " + item.requested() + ".";
        } else {
            message = "Some items are out of stock.";
        }

        Map<String, Object> body = new HashMap<>();
        body.put("message", message);
        body.put("items", items);
        return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
    }
}

