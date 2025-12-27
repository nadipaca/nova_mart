package com.novamart.order.inventory;

import java.util.List;

public class InsufficientStockException extends RuntimeException {

    private final List<InsufficientStockItem> items;

    public InsufficientStockException(List<InsufficientStockItem> items) {
        super("Insufficient stock");
        this.items = items;
    }

    public List<InsufficientStockItem> getItems() {
        return items;
    }
}

