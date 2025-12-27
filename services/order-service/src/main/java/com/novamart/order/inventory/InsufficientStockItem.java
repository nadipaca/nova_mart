package com.novamart.order.inventory;

public record InsufficientStockItem(String productId, int requested, int available) {}

